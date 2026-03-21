import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import { ensureFacultyContext } from "@/lib/faculty/migration";
import { getFacultyReportDefaults } from "@/lib/faculty/report-defaults";
import Organization from "@/models/core/organization";
import Department from "@/models/reference/department";
import Faculty from "@/models/faculty/faculty";
import User from "@/models/core/user";
import CasApplication, { type CasStatus } from "@/models/core/cas-application";
import { casApplicationSchema, casApprovalSchema, casReviewSchema } from "@/lib/cas/validators";
import { getPbasReportsByIdsForFaculty } from "@/lib/pbas/service";
import CasApiScoreBreakup from "@/models/core/cas-api-score-breakup";
import CasPromotionHistory from "@/models/core/cas-promotion-history";
import ApprovalWorkflow from "@/models/core/approval-workflow";
import AuditLog from "@/models/core/audit-log";
import FacultyPbasForm from "@/models/core/faculty-pbas-form";
import CasSupportingDocument from "@/models/core/cas-supporting-document";
import DocumentModel from "@/models/reference/document";

type SafeActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
};

type CasAchievementBucket = {
    publications: Array<{ title: string; journal: string; year: number; issn?: string; indexing?: string }>;
    books: Array<{ title: string; publisher: string; isbn?: string; year: number }>;
    researchProjects: Array<{ title: string; fundingAgency: string; amount: number; year: number }>;
    phdGuided: number;
    conferences: number;
};

async function buildLinkedAchievementsForFaculty(facultyUserId: string): Promise<CasAchievementBucket> {
    const defaults = await getFacultyReportDefaults(facultyUserId);

    return {
        publications: defaults.cas.publications,
        books: defaults.cas.books,
        researchProjects: defaults.cas.researchProjects,
        phdGuided: 0,
        conferences: defaults.cas.conferences,
    };
}

function scorePublication(indexing?: string) {
    const value = (indexing ?? "").toLowerCase();

    if (value.includes("scopus") || value.includes("ugc care") || value.includes("web of science")) {
        return 12;
    }

    if (value.includes("peer")) {
        return 8;
    }

    return 5;
}

export async function computeCasApiScore(
    facultyId: string,
    input: ReturnType<typeof casApplicationSchema.parse>
) {
    const selectedPbas = await getPbasReportsByIdsForFaculty(facultyId, input.pbasReports);

    const teachingLearning = Math.min(
        100,
        selectedPbas.reduce((sum, entry) => sum + Number(entry.apiScore?.teachingActivities ?? 0), 0)
    );
    const researchFromPbas = selectedPbas.reduce(
        (sum, entry) => sum + Number(entry.apiScore?.researchAcademicContribution ?? 0),
        0
    );

    const publicationScore = input.manualAchievements.publications.reduce(
        (sum, publication) => sum + scorePublication(publication.indexing),
        0
    );
    const booksScore = input.manualAchievements.books.length * 15;
    const projectScore = input.manualAchievements.researchProjects.reduce((sum, project) => {
        if (project.amount >= 1000000) return sum + 12;
        if (project.amount >= 250000) return sum + 8;
        return sum + 5;
    }, 0);
    const phdScore = input.manualAchievements.phdGuided * 12;
    const conferenceScore = input.manualAchievements.conferences * 4;

    const researchPublication = Math.min(
        150,
        researchFromPbas + publicationScore + booksScore + projectScore + phdScore + conferenceScore
    );

    const academicContribution = Math.min(
        100,
        selectedPbas.reduce(
            (sum, entry) => sum + Number(entry.apiScore?.institutionalResponsibilities ?? 0),
            0
        ) + Math.min(input.manualAchievements.conferences * 2, 20)
    );

    return {
        teachingLearning,
        researchPublication,
        academicContribution,
        totalScore: teachingLearning + researchPublication + academicContribution,
    };
}

type CasEligibility = {
    eligible: boolean;
    reason: string;
    requiredYears?: number;
    requiredScore?: number;
    currentDesignation?: string;
    nextDesignation?: string;
    experienceYears?: number;
    lastApprovedApiScore?: number;
    lastApprovedYear?: string;
    approvedPbasCount: number;
    missingProfileFields: string[];
};

function resolveCasRule(currentDesignation: string) {
    const value = currentDesignation.toLowerCase();

    if (value.includes("stage 1")) {
        return { next: "Assistant Professor (Stage 2)", minExperience: 4, minApi: 120 };
    }
    if (value.includes("stage 2")) {
        return { next: "Assistant Professor (Stage 3)", minExperience: 5, minApi: 140 };
    }
    if (value.includes("stage 3")) {
        return { next: "Assistant Professor (Stage 4)", minExperience: 3, minApi: 180 };
    }
    if (value.includes("associate professor")) {
        return { next: "Professor", minExperience: 3, minApi: 220 };
    }

    return null;
}

export async function getCasEligibilityForFaculty(actor: SafeActor): Promise<CasEligibility> {
    await dbConnect();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can access CAS eligibility.", 403);
    }

    const { faculty } = await ensureFacultyContext(actor.id);
    const missingProfileFields: string[] = [];

    if (!faculty.designation) {
        missingProfileFields.push("designation");
    }

    let experienceYears = faculty.experienceYears ?? 0;
    if (!experienceYears) {
        if (faculty.joiningDate) {
            const diffMs = Date.now() - new Date(faculty.joiningDate).getTime();
            experienceYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
        } else {
            missingProfileFields.push("joiningDate");
        }
    }

    const approvedPbas = await FacultyPbasForm.find({
        facultyId: faculty._id,
        status: "Approved",
    }).sort({ updatedAt: -1 });

    const approvedPbasCount = approvedPbas.length;
    const lastApproved = approvedPbas[0];
    const lastApprovedApiScore = lastApproved?.apiScore?.totalScore ?? 0;
    const lastApprovedYear = lastApproved?.academicYear;

    if (!approvedPbasCount) {
        return {
            eligible: false,
            reason: "No approved PBAS records found. Submit and get PBAS approved before applying for CAS.",
            currentDesignation: faculty.designation,
            nextDesignation: undefined,
            experienceYears,
            lastApprovedApiScore,
            lastApprovedYear,
            approvedPbasCount,
            missingProfileFields,
        };
    }

    if (!faculty.designation) {
        return {
            eligible: false,
            reason: "Faculty designation is missing.",
            currentDesignation: faculty.designation,
            experienceYears,
            lastApprovedApiScore,
            lastApprovedYear,
            approvedPbasCount,
            missingProfileFields,
        };
    }

    const rule = resolveCasRule(faculty.designation);
    if (!rule) {
        return {
            eligible: false,
            reason: "CAS promotion path is not configured for the current designation.",
            currentDesignation: faculty.designation,
            experienceYears,
            lastApprovedApiScore,
            lastApprovedYear,
            approvedPbasCount,
            missingProfileFields,
        };
    }

    const meetsExperience = experienceYears >= rule.minExperience;
    const meetsScore = lastApprovedApiScore >= rule.minApi;
    const eligible = meetsExperience && meetsScore;

    return {
        eligible,
        reason: eligible
            ? "Eligible to apply for CAS promotion."
            : "Eligibility criteria not met. Ensure required experience and approved PBAS API score.",
        requiredYears: rule.minExperience,
        requiredScore: rule.minApi,
        currentDesignation: faculty.designation,
        nextDesignation: rule.next,
        experienceYears,
        lastApprovedApiScore,
        lastApprovedYear,
        approvedPbasCount,
        missingProfileFields,
    };
}

async function upsertCasBreakup(application: InstanceType<typeof CasApplication>) {
    const entries = [
        {
            categoryCode: "A",
            scoreObtained: Number(application.apiScore?.teachingLearning ?? 0),
            minimumRequired: 0,
        },
        {
            categoryCode: "B",
            scoreObtained: Number(application.apiScore?.researchPublication ?? 0),
            minimumRequired: 0,
        },
        {
            categoryCode: "C",
            scoreObtained: Number(application.apiScore?.academicContribution ?? 0),
            minimumRequired: 0,
        },
    ];

    await Promise.all(
        entries.map((entry) =>
            CasApiScoreBreakup.updateOne(
                { casApplicationId: application._id, categoryCode: entry.categoryCode },
                {
                    $set: {
                        casApplicationId: application._id,
                        categoryCode: entry.categoryCode,
                        scoreObtained: entry.scoreObtained,
                        minimumRequired: entry.minimumRequired,
                        eligible: entry.scoreObtained >= entry.minimumRequired,
                    },
                },
                { upsert: true }
            )
        )
    );
}

async function upsertWorkflow(moduleName: "CAS", recordId: string, actorRole: string, status: string, remarks?: string) {
    await ApprovalWorkflow.updateOne(
        { moduleName, recordId },
        {
            $set: {
                moduleName,
                recordId,
                currentApproverRole: actorRole,
                status,
                remarks,
            },
        },
        { upsert: true }
    );
}

async function audit(actor: SafeActor | undefined, action: string, tableName: string, recordId?: string, oldData?: unknown, newData?: unknown) {
    await AuditLog.create({
        userId: actor ? new Types.ObjectId(actor.id) : undefined,
        action,
        tableName,
        recordId,
        oldData,
        newData,
    });
}

export function evaluateCasEligibility(input: ReturnType<typeof casApplicationSchema.parse>, apiTotalScore: number) {
    const from = input.currentDesignation.toLowerCase();
    const to = input.applyingForDesignation.toLowerCase();

    const rules = [
        {
            match: from.includes("stage 1") && to.includes("stage 2"),
            minExperience: 4,
            minApi: 120,
            message: "Stage 1 to Stage 2 requires at least 4 years of experience and a minimum API score of 120.",
        },
        {
            match: from.includes("stage 2") && to.includes("stage 3"),
            minExperience: 5,
            minApi: 140,
            message: "Stage 2 to Stage 3 requires at least 5 years of experience and a minimum API score of 140.",
        },
        {
            match:
                (from.includes("stage 3") && (to.includes("stage 4") || to.includes("associate professor"))) ||
                (from.includes("assistant professor") && to.includes("associate professor")),
            minExperience: 3,
            minApi: 180,
            message: "Stage 3 to Associate Professor requires at least 3 years of experience and a strong API score.",
        },
        {
            match: from.includes("associate professor") && to.includes("professor"),
            minExperience: 3,
            minApi: 220,
            message: "Associate Professor to Professor requires at least 3 years of experience and a high research output.",
        },
    ];

    const matchedRule = rules.find((rule) => rule.match);

    if (!matchedRule) {
        return {
            isEligible: false,
            message: "This CAS promotion path is not configured in the system.",
            minimumExperienceYears: undefined,
            minimumApiScore: undefined,
        };
    }

    const isEligible =
        input.experienceYears >= matchedRule.minExperience && apiTotalScore >= matchedRule.minApi;

    return {
        isEligible,
        message: isEligible
            ? `Eligible for ${input.applyingForDesignation}.`
            : matchedRule.message,
        minimumExperienceYears: matchedRule.minExperience,
        minimumApiScore: matchedRule.minApi,
    };
}

async function getDepartmentHeadedByUser(userId: string) {
    return Organization.findOne({
        type: "Department",
        headUserId: userId,
        isActive: true,
    }).select("name");
}

function pushStatusLog(
    application: InstanceType<typeof CasApplication>,
    status: CasStatus,
    actor?: SafeActor,
    remarks?: string
) {
    application.statusLogs.push({
        status,
        actorId: actor ? new Types.ObjectId(actor.id) : undefined,
        actorName: actor?.name,
        actorRole: actor?.role,
        remarks,
        changedAt: new Date(),
    });
}

async function getUserForApplication(application: InstanceType<typeof CasApplication>) {
    const faculty = await Faculty.findById(application.facultyId).select(
        "userId departmentId designation"
    );

    if (!faculty?.userId) {
        throw new AuthError("Faculty account not found.", 404);
    }

    const user = await User.findById(faculty.userId).select(
        "name email role department designation universityName collegeName"
    );

    if (!user) {
        throw new AuthError("Faculty account not found.", 404);
    }

    const department = faculty.departmentId
        ? await Department.findById(faculty.departmentId).select("name")
        : null;

    return {
        ...user,
        department: department?.name ?? user.department,
        designation: faculty.designation || user.designation,
    };
}

export async function createCasApplication(actor: SafeActor, rawInput: unknown) {
    const input = casApplicationSchema.parse(rawInput);
    await dbConnect();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can create CAS applications.", 403);
    }

    const { faculty } = await ensureFacultyContext(actor.id);
    const linkedAchievements = await buildLinkedAchievementsForFaculty(actor.id);
    const apiScore = await computeCasApiScore(faculty._id.toString(), input);
    const eligibility = evaluateCasEligibility(input, apiScore.totalScore);

    const application = await CasApplication.create({
        facultyId: faculty._id,
        applicationYear: input.applicationYear,
        currentDesignation: input.currentDesignation,
        applyingForDesignation: input.applyingForDesignation,
        applicationDate: new Date(),
        eligibilityPeriod: input.eligibilityPeriod,
        experienceYears: input.experienceYears,
        pbasReports: input.pbasReports.map((id) => new Types.ObjectId(id)),
        apiScoreCalculated: apiScore.totalScore,
        apiScore,
        linkedAchievements,
        manualAchievements: input.manualAchievements,
        achievements: undefined,
        eligibility,
        reviewCommittee: [],
        statusLogs: [
            {
                status: "Draft",
                actorId: new Types.ObjectId(actor.id),
                actorName: actor.name,
                actorRole: actor.role,
                remarks: "CAS application draft created.",
                changedAt: new Date(),
            },
        ],
        status: "Draft",
    });

    await upsertCasBreakup(application);
    await upsertWorkflow("CAS", application._id.toString(), actor.role, application.status, "CAS draft created.");
    await audit(actor, "CAS_CREATE", "cas_applications", application._id.toString(), undefined, {
        facultyId: application.facultyId,
        applicationYear: application.applicationYear,
        status: application.status,
    });

    return application;
}

export async function getFacultyCasApplications(actor: SafeActor) {
    await dbConnect();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can view their CAS applications.", 403);
    }

    const { faculty } = await ensureFacultyContext(actor.id);

    return CasApplication.find({ facultyId: faculty._id }).sort({ updatedAt: -1 });
}

export async function getCasApplicationById(actor: SafeActor, id: string) {
    await dbConnect();
    const application = await CasApplication.findById(id);

    if (!application) {
        throw new AuthError("CAS application not found.", 404);
    }

    if (actor.role === "Admin") {
        return application;
    }

    if (actor.role === "Faculty") {
        const { faculty } = await ensureFacultyContext(actor.id);
        if (application.facultyId.toString() === faculty._id.toString()) {
            return application;
        }
    }

    const headedDepartment = await getDepartmentHeadedByUser(actor.id);

    if (headedDepartment) {
        const faculty = await getUserForApplication(application);
        if (faculty.department === headedDepartment.name) {
            return application;
        }
    }

    throw new AuthError("You do not have access to this CAS application.", 403);
}

export async function updateCasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = casApplicationSchema.parse(rawInput);
    const application = await getCasApplicationById(actor, id);
    const facultyContext = actor.role === "Faculty" ? await ensureFacultyContext(actor.id) : null;

    if (
        actor.role !== "Faculty" ||
        application.facultyId.toString() !== facultyContext?.faculty._id.toString()
    ) {
        throw new AuthError("Only the faculty owner can update this CAS application.", 403);
    }

    if (!["Draft", "Rejected"].includes(application.status)) {
        throw new AuthError("Only draft or rejected CAS applications can be edited.", 409);
    }

    const oldState = application.toObject();
    const linkedAchievements = await buildLinkedAchievementsForFaculty(actor.id);
    const apiScore = await computeCasApiScore(facultyContext.faculty._id.toString(), input);
    const eligibility = evaluateCasEligibility(input, apiScore.totalScore);

    application.applicationYear = input.applicationYear;
    application.currentDesignation = input.currentDesignation;
    application.applyingForDesignation = input.applyingForDesignation;
    application.eligibilityPeriod = input.eligibilityPeriod;
    application.experienceYears = input.experienceYears;
    application.pbasReports = input.pbasReports.map((entry) => new Types.ObjectId(entry));
    application.apiScoreCalculated = apiScore.totalScore;
    application.apiScore = apiScore;
    application.linkedAchievements = linkedAchievements;
    application.manualAchievements = input.manualAchievements;
    application.achievements = undefined;
    application.eligibility = eligibility;

    pushStatusLog(application, application.status, actor, "CAS application draft auto-saved.");
    await application.save();
    await upsertCasBreakup(application);
    await upsertWorkflow("CAS", application._id.toString(), actor.role, application.status, "CAS draft updated.");
    await audit(actor, "CAS_UPDATE", "cas_applications", application._id.toString(), oldState, application.toObject());

    return application;
}

export async function submitCasApplication(actor: SafeActor, id: string) {
    const application = await getCasApplicationById(actor, id);
    const facultyContext = actor.role === "Faculty" ? await ensureFacultyContext(actor.id) : null;

    if (
        actor.role !== "Faculty" ||
        application.facultyId.toString() !== facultyContext?.faculty._id.toString()
    ) {
        throw new AuthError("Only the faculty owner can submit this CAS application.", 403);
    }

    if (!["Draft", "Rejected"].includes(application.status)) {
        throw new AuthError("Only draft or rejected applications can be submitted.", 409);
    }

    if (!application.eligibility.isEligible) {
        throw new AuthError(application.eligibility.message || "CAS eligibility requirements are not satisfied.", 400);
    }

    if (!application.pbasReports.length) {
        throw new AuthError("At least one PBAS report must be linked before submission.", 400);
    }

    const approvedPbas = await FacultyPbasForm.find({
        _id: { $in: application.pbasReports },
        facultyId: application.facultyId,
        status: "Approved",
    }).select("_id");

    if (approvedPbas.length !== application.pbasReports.length) {
        throw new AuthError("CAS submission requires approved PBAS reports only.", 400);
    }

    const requiredDocs = await CasSupportingDocument.find({
        casApplicationId: application._id,
        documentType: { $in: CAS_REQUIRED_DOCUMENTS.map((item) => item.documentType) },
    }).select("documentType");

    if (requiredDocs.length < CAS_REQUIRED_DOCUMENTS.length) {
        throw new AuthError("Upload all mandatory CAS documents before submission.", 400);
    }

    application.status = "Submitted";
    application.submittedAt = new Date();
    pushStatusLog(application, "Submitted", actor, "Faculty submitted CAS application.");
    await application.save();
    await upsertCasBreakup(application);
    await upsertWorkflow("CAS", application._id.toString(), actor.role, application.status, "CAS submitted.");
    await audit(actor, "CAS_SUBMIT", "cas_applications", application._id.toString());

    return application;
}

export async function reviewCasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = casReviewSchema.parse(rawInput);
    const application = await getCasApplicationById(actor, id);

    const faculty = await getUserForApplication(application);
    const headedDepartment = await getDepartmentHeadedByUser(actor.id);
    const isDepartmentHead =
        Boolean(headedDepartment) && faculty.department === headedDepartment?.name;
    const isCommitteeReviewer = actor.role === "Admin" || actor.role === "Director";

    if (!isDepartmentHead && !isCommitteeReviewer) {
        throw new AuthError("You are not authorized to review this CAS application.", 403);
    }

    if (input.decision === "Reject") {
        application.status = "Rejected";
        application.reviewCommittee.push({
            reviewerId: new Types.ObjectId(actor.id),
            reviewerName: actor.name,
            reviewerRole: actor.role,
            designation: actor.role === "Admin" ? "Admin Reviewer" : "Department Head",
            remarks: input.remarks,
            decision: input.decision,
            stage: isDepartmentHead ? "Department Head" : "CAS Committee",
            reviewedAt: new Date(),
        });
        pushStatusLog(application, "Rejected", actor, input.remarks);
        await application.save();
        await upsertWorkflow("CAS", application._id.toString(), actor.role, application.status, input.remarks);
        await audit(actor, "CAS_REVIEW_REJECT", "cas_applications", application._id.toString(), undefined, {
            status: application.status,
            remarks: input.remarks,
        });
        return application;
    }

    const nextStatus: CasStatus =
        application.status === "Submitted"
            ? "Under Review"
            : "Committee Review";

    application.status = nextStatus;
    application.reviewCommittee.push({
        reviewerId: new Types.ObjectId(actor.id),
        reviewerName: actor.name,
        reviewerRole: actor.role,
        designation:
            application.status === "Under Review"
                ? "Department Head Reviewer"
                : "CAS Committee Reviewer",
        remarks: input.remarks,
        decision: input.decision,
        stage: nextStatus === "Under Review" ? "Department Head" : "CAS Committee",
        reviewedAt: new Date(),
    });
    pushStatusLog(application, nextStatus, actor, input.remarks);
    await application.save();
    await upsertWorkflow("CAS", application._id.toString(), actor.role, application.status, input.remarks);
    await audit(actor, "CAS_REVIEW", "cas_applications", application._id.toString(), undefined, {
        status: application.status,
        remarks: input.remarks,
    });

    return application;
}

export async function approveCasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = casApprovalSchema.parse(rawInput);

    if (actor.role !== "Admin") {
        throw new AuthError("Only admin users can finalize CAS approval.", 403);
    }

    const application = await getCasApplicationById(actor, id);

    application.status = input.decision === "Approve" ? "Approved" : "Rejected";
    application.reviewCommittee.push({
        reviewerId: new Types.ObjectId(actor.id),
        reviewerName: actor.name,
        reviewerRole: actor.role,
        designation: "Admin Final Approver",
        remarks: input.remarks,
        decision: input.decision,
        stage: "Admin",
        reviewedAt: new Date(),
    });
    pushStatusLog(application, application.status, actor, input.remarks);
    await application.save();
    await upsertCasBreakup(application);
    await upsertWorkflow("CAS", application._id.toString(), actor.role, application.status, input.remarks);
    await audit(actor, "CAS_APPROVE", "cas_applications", application._id.toString(), undefined, {
        status: application.status,
        decision: input.decision,
        remarks: input.remarks,
    });

    if (application.status === "Approved") {
        await CasPromotionHistory.create({
            facultyId: application.facultyId,
            oldDesignation: application.currentDesignation,
            newDesignation: application.applyingForDesignation,
            promotionDate: new Date(),
        });
    }

    return application;
}

const CAS_REQUIRED_DOCUMENTS = [
    { documentType: "PBAS_REPORT", label: "PBAS Consolidated Report", isMandatory: true },
    { documentType: "EXPERIENCE_CERT", label: "Experience Certificate", isMandatory: true },
    { documentType: "QUALIFICATION_PROOF", label: "Qualification Proof", isMandatory: true },
];

export async function getCasDocuments(actor: SafeActor, id: string) {
    await dbConnect();
    const application = await getCasApplicationById(actor, id);

    const docs = await CasSupportingDocument.find({ casApplicationId: application._id })
        .populate("documentId", "fileName fileUrl fileType")
        .lean();

    const byType = new Map<string, typeof docs[number]>();
    for (const doc of docs) {
        byType.set(doc.documentType, doc);
    }

    return CAS_REQUIRED_DOCUMENTS.map((item) => {
        const existing = byType.get(item.documentType);
        return {
            ...item,
            documentId: existing?.documentId ?? null,
            uploadedAt: existing?.uploadedAt ?? null,
        };
    });
}

export async function getCasWorkflowStatus(actor: SafeActor, id: string) {
    await dbConnect();
    const application = await getCasApplicationById(actor, id);

    const workflow = await ApprovalWorkflow.findOne({
        moduleName: "CAS",
        recordId: application._id.toString(),
    }).lean();

    return workflow
        ? {
            moduleName: workflow.moduleName,
            recordId: workflow.recordId,
            currentApproverRole: workflow.currentApproverRole,
            status: workflow.status,
            remarks: workflow.remarks,
            createdAt: workflow.createdAt,
            updatedAt: workflow.updatedAt,
        }
        : null;
}

export async function saveCasDocument(
    actor: SafeActor,
    id: string,
    input: { documentType: string; documentId: string }
) {
    await dbConnect();
    const application = await getCasApplicationById(actor, id);

    const meta = CAS_REQUIRED_DOCUMENTS.find(
        (item) => item.documentType === input.documentType
    );

    const document = await DocumentModel.findById(input.documentId).select("_id");
    if (!document) {
        throw new AuthError("Document not found.", 404);
    }

    await CasSupportingDocument.updateOne(
        { casApplicationId: application._id, documentType: input.documentType },
        {
            $set: {
                casApplicationId: application._id,
                documentId: document._id,
                documentType: input.documentType,
                label: meta?.label ?? input.documentType,
                isMandatory: meta?.isMandatory ?? true,
                uploadedAt: new Date(),
            },
        },
        { upsert: true }
    );

    return getCasDocuments(actor, application._id.toString());
}

export async function getCasReviewQueue(actor: SafeActor) {
    await dbConnect();

    if (actor.role === "Admin") {
        return CasApplication.find({
            status: { $in: ["Under Review", "Committee Review", "Submitted"] },
        }).sort({ updatedAt: -1 });
    }

    const headedDepartment = await getDepartmentHeadedByUser(actor.id);

    if (!headedDepartment) {
        return [];
    }

    const departments = await Department.find({ name: headedDepartment.name }).select("_id");
    const facultyUsers = await Faculty.find({
        departmentId: { $in: departments.map((item) => item._id) },
    }).select("_id");

    return CasApplication.find({
        facultyId: { $in: facultyUsers.map((item) => item._id) },
        status: { $in: ["Submitted", "Under Review"] },
    }).sort({ updatedAt: -1 });
}
