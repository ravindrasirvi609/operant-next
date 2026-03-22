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
import CasPromotionRule from "@/models/core/cas-promotion-rule";
import ApprovalWorkflow from "@/models/core/approval-workflow";
import AuditLog from "@/models/core/audit-log";
import FacultyPbasForm from "@/models/core/faculty-pbas-form";
import CasSupportingDocument from "@/models/core/cas-supporting-document";
import CasScreeningCommitteeMember from "@/models/core/cas-screening-committee";
import DocumentModel from "@/models/reference/document";
import { getDefaultCasTarget } from "@/lib/faculty/options";

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

type CasCategoryMinimums = {
    teachingLearning: number;
    researchPublication: number;
    academicContribution: number;
};

type CasApplicationInput = ReturnType<typeof casApplicationSchema.parse>;

const CAS_SCORE_CAPS: CasCategoryMinimums = {
    teachingLearning: 100,
    researchPublication: 150,
    academicContribution: 100,
};

const DEFAULT_CAS_PROMOTION_RULES = [
    {
        currentDesignation: "Assistant Professor (Stage 1)",
        targetDesignation: "Assistant Professor (Stage 2)",
        minExperienceYears: 4,
        minApiScore: 120,
        notes: "Stage 1 to Stage 2 requires at least 4 years of experience and a minimum API score of 120.",
    },
    {
        currentDesignation: "Assistant Professor (Stage 2)",
        targetDesignation: "Assistant Professor (Stage 3)",
        minExperienceYears: 5,
        minApiScore: 140,
        notes: "Stage 2 to Stage 3 requires at least 5 years of experience and a minimum API score of 140.",
    },
    {
        currentDesignation: "Assistant Professor (Stage 3)",
        targetDesignation: "Assistant Professor (Stage 4)",
        minExperienceYears: 3,
        minApiScore: 180,
        notes: "Stage 3 to Stage 4 requires at least 3 years of experience and a strong API score.",
    },
    {
        currentDesignation: "Assistant Professor (Stage 3)",
        targetDesignation: "Associate Professor",
        minExperienceYears: 3,
        minApiScore: 180,
        notes: "Stage 3 to Associate Professor requires at least 3 years of experience and a strong API score.",
    },
    {
        currentDesignation: "Assistant Professor (Stage 4)",
        targetDesignation: "Associate Professor",
        minExperienceYears: 3,
        minApiScore: 180,
        notes: "Stage 4 to Associate Professor requires at least 3 years of experience and a strong API score.",
    },
    {
        currentDesignation: "Associate Professor",
        targetDesignation: "Professor",
        minExperienceYears: 3,
        minApiScore: 220,
        notes: "Associate Professor to Professor requires at least 3 years of experience and a high research output.",
    },
] as const;

function roundScore(value: number) {
    return Math.round(value * 100) / 100;
}

function deriveCategoryMinimums(
    minApiScore: number,
    explicitMinimums?: Partial<CasCategoryMinimums> | null
): CasCategoryMinimums {
    const explicit = {
        teachingLearning: Number(explicitMinimums?.teachingLearning ?? 0),
        researchPublication: Number(explicitMinimums?.researchPublication ?? 0),
        academicContribution: Number(explicitMinimums?.academicContribution ?? 0),
    };

    if (explicit.teachingLearning || explicit.researchPublication || explicit.academicContribution) {
        return explicit;
    }

    const totalCap =
        CAS_SCORE_CAPS.teachingLearning +
        CAS_SCORE_CAPS.researchPublication +
        CAS_SCORE_CAPS.academicContribution;

    return {
        teachingLearning: roundScore((minApiScore * CAS_SCORE_CAPS.teachingLearning) / totalCap),
        researchPublication: roundScore((minApiScore * CAS_SCORE_CAPS.researchPublication) / totalCap),
        academicContribution: roundScore((minApiScore * CAS_SCORE_CAPS.academicContribution) / totalCap),
    };
}

async function ensureCasPromotionRules() {
    const existingRules = await CasPromotionRule.countDocuments({});

    if (existingRules > 0) {
        return;
    }

    await CasPromotionRule.insertMany(
        DEFAULT_CAS_PROMOTION_RULES.map((rule) => ({
            ...rule,
            isActive: true,
            categoryMinimums: deriveCategoryMinimums(rule.minApiScore),
        }))
    );
}

async function getCasPromotionRule(currentDesignation?: string | null, targetDesignation?: string | null) {
    if (!currentDesignation) {
        return null;
    }

    await ensureCasPromotionRules();

    const preferredTarget =
        targetDesignation ??
        getDefaultCasTarget(currentDesignation);

    const exactRule = await CasPromotionRule.findOne({
        currentDesignation,
        targetDesignation: preferredTarget,
        isActive: true,
    }).lean();

    if (exactRule) {
        return exactRule;
    }

    return CasPromotionRule.findOne({
        currentDesignation,
        isActive: true,
    })
        .sort({ minApiScore: 1, targetDesignation: 1 })
        .lean();
}

async function evaluateCasEligibility(input: CasApplicationInput, apiTotalScore: number) {
    const matchedRule = await getCasPromotionRule(
        input.currentDesignation,
        input.applyingForDesignation
    );

    if (!matchedRule) {
        return {
            isEligible: false,
            message: "This CAS promotion path is not configured in the system.",
            minimumExperienceYears: undefined,
            minimumApiScore: undefined,
        };
    }

    const isEligible =
        input.experienceYears >= matchedRule.minExperienceYears &&
        apiTotalScore >= matchedRule.minApiScore;

    return {
        isEligible,
        message: isEligible
            ? `Eligible for ${input.applyingForDesignation}.`
            : matchedRule.notes ||
              `This path requires minimum ${matchedRule.minExperienceYears} years experience and API score ${matchedRule.minApiScore}.`,
        minimumExperienceYears: matchedRule.minExperienceYears,
        minimumApiScore: matchedRule.minApiScore,
    };
}

async function buildLinkedAchievementsForFaculty(facultyUserId: string): Promise<CasAchievementBucket> {
    const defaults = await getFacultyReportDefaults(facultyUserId);

    return {
        publications: defaults.cas.publications,
        books: defaults.cas.books,
        researchProjects: defaults.cas.researchProjects,
        phdGuided: defaults.cas.phdGuided ?? 0,
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
    input: CasApplicationInput
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

export async function getCasEligibilityForFaculty(actor: SafeActor): Promise<CasEligibility> {
    await dbConnect();
    await ensureCasPromotionRules();

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

    const rule = await getCasPromotionRule(faculty.designation);
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

    const meetsExperience = experienceYears >= rule.minExperienceYears;
    const meetsScore = lastApprovedApiScore >= rule.minApiScore;
    const eligible = meetsExperience && meetsScore;

    return {
        eligible,
        reason: eligible
            ? "Eligible to apply for CAS promotion."
            : "Eligibility criteria not met. Ensure required experience and approved PBAS API score.",
        requiredYears: rule.minExperienceYears,
        requiredScore: rule.minApiScore,
        currentDesignation: faculty.designation,
        nextDesignation: rule.targetDesignation,
        experienceYears,
        lastApprovedApiScore,
        lastApprovedYear,
        approvedPbasCount,
        missingProfileFields,
    };
}

async function upsertCasBreakup(application: InstanceType<typeof CasApplication>) {
    const rule = await getCasPromotionRule(
        application.currentDesignation,
        application.applyingForDesignation
    );
    const minimums = deriveCategoryMinimums(
        Number(rule?.minApiScore ?? 0),
        rule?.categoryMinimums
    );
    const entries = [
        {
            categoryCode: "A",
            scoreObtained: Number(application.apiScore?.teachingLearning ?? 0),
            minimumRequired: minimums.teachingLearning,
        },
        {
            categoryCode: "B",
            scoreObtained: Number(application.apiScore?.researchPublication ?? 0),
            minimumRequired: minimums.researchPublication,
        },
        {
            categoryCode: "C",
            scoreObtained: Number(application.apiScore?.academicContribution ?? 0),
            minimumRequired: minimums.academicContribution,
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

async function loadCasCommitteeReviews(applicationIds: string[]) {
    if (!applicationIds.length) {
        return new Map<string, Array<Record<string, unknown>>>();
    }

    const reviews = await CasScreeningCommitteeMember.find({
        casApplicationId: { $in: applicationIds.map((id) => new Types.ObjectId(id)) },
    })
        .sort({ decisionDate: 1, createdAt: 1 })
        .lean();

    const grouped = new Map<string, Array<Record<string, unknown>>>();

    for (const review of reviews) {
        const key = review.casApplicationId.toString();
        const current = grouped.get(key) ?? [];
        current.push({
            _id: review._id.toString(),
            reviewerUserId: review.reviewerUserId?.toString(),
            committeeMemberName: review.committeeMemberName,
            designation: review.designation,
            role: review.role,
            reviewerRole: review.reviewerRole,
            stage: review.stage,
            remarks: review.remarks,
            decision: review.decision,
            decisionDate: review.decisionDate,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
        });
        grouped.set(key, current);
    }

    return grouped;
}

async function loadCasApiBreakups(applicationIds: string[]) {
    if (!applicationIds.length) {
        return new Map<string, Array<Record<string, unknown>>>();
    }

    const breakups = await CasApiScoreBreakup.find({
        casApplicationId: { $in: applicationIds.map((id) => new Types.ObjectId(id)) },
    })
        .sort({ categoryCode: 1 })
        .lean();

    const grouped = new Map<string, Array<Record<string, unknown>>>();

    for (const entry of breakups) {
        const key = entry.casApplicationId.toString();
        const current = grouped.get(key) ?? [];
        current.push({
            _id: entry._id.toString(),
            categoryCode: entry.categoryCode,
            scoreObtained: entry.scoreObtained,
            minimumRequired: entry.minimumRequired,
            eligible: entry.eligible,
        });
        grouped.set(key, current);
    }

    return grouped;
}

async function serializeCasApplications(applications: Array<InstanceType<typeof CasApplication>>) {
    const ids = applications.map((application) => application._id.toString());
    const [committeeReviewsByApplication, apiBreakupByApplication] = await Promise.all([
        loadCasCommitteeReviews(ids),
        loadCasApiBreakups(ids),
    ]);

    return applications.map((application) => {
        const serialized = application.toObject();
        return {
            ...serialized,
            committeeReviews:
                committeeReviewsByApplication.get(application._id.toString()) ?? [],
            apiBreakup: apiBreakupByApplication.get(application._id.toString()) ?? [],
        };
    });
}

async function serializeCasApplication(application: InstanceType<typeof CasApplication>) {
    const [serialized] = await serializeCasApplications([application]);
    return serialized;
}

async function getCasApplicationDocumentById(actor: SafeActor, id: string) {
    await dbConnect();
    await ensureCasPromotionRules();

    const application = await CasApplication.findById(id);

    if (!application) {
        throw new AuthError("CAS application not found.", 404);
    }

    if (actor.role === "Admin" || actor.role === "Director") {
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

async function recordCasCommitteeReview(
    application: InstanceType<typeof CasApplication>,
    actor: SafeActor,
    input: { remarks: string; decision: string },
    stage: "Department Head" | "CAS Committee" | "Admin"
) {
    const role =
        stage === "Department Head"
            ? "department_head"
            : stage === "Admin"
              ? "admin"
              : "cas_committee";
    const designation =
        stage === "Department Head"
            ? "Department Head Reviewer"
            : stage === "Admin"
              ? "Admin Final Approver"
              : "CAS Committee Reviewer";

    await CasScreeningCommitteeMember.create({
        casApplicationId: application._id,
        reviewerUserId: new Types.ObjectId(actor.id),
        committeeMemberName: actor.name,
        designation,
        role,
        reviewerRole: actor.role,
        stage,
        remarks: input.remarks,
        decision: input.decision,
        decisionDate: new Date(),
    });
}

export async function createCasApplication(actor: SafeActor, rawInput: unknown) {
    const input = casApplicationSchema.parse(rawInput);
    await dbConnect();
    await ensureCasPromotionRules();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can create CAS applications.", 403);
    }

    const { faculty } = await ensureFacultyContext(actor.id);
    const linkedAchievements = await buildLinkedAchievementsForFaculty(actor.id);
    const apiScore = await computeCasApiScore(faculty._id.toString(), input);
    const eligibility = await evaluateCasEligibility(input, apiScore.totalScore);

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
        eligibility,
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
    await upsertWorkflow("CAS", application._id.toString(), "Faculty", application.status, "CAS draft created.");
    await audit(actor, "CAS_CREATE", "cas_applications", application._id.toString(), undefined, {
        facultyId: application.facultyId,
        applicationYear: application.applicationYear,
        status: application.status,
    });

    return serializeCasApplication(application);
}

export async function getFacultyCasApplications(actor: SafeActor) {
    await dbConnect();
    await ensureCasPromotionRules();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can view their CAS applications.", 403);
    }

    const { faculty } = await ensureFacultyContext(actor.id);

    const applications = await CasApplication.find({ facultyId: faculty._id }).sort({ updatedAt: -1 });

    return serializeCasApplications(applications);
}

export async function getCasApplicationById(actor: SafeActor, id: string) {
    const application = await getCasApplicationDocumentById(actor, id);
    return serializeCasApplication(application);
}

export async function updateCasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = casApplicationSchema.parse(rawInput);
    const application = await getCasApplicationDocumentById(actor, id);
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
    const eligibility = await evaluateCasEligibility(input, apiScore.totalScore);

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
    application.eligibility = eligibility;

    pushStatusLog(application, application.status, actor, "CAS application draft auto-saved.");
    await application.save();
    await upsertCasBreakup(application);
    await upsertWorkflow("CAS", application._id.toString(), "Faculty", application.status, "CAS draft updated.");
    await audit(actor, "CAS_UPDATE", "cas_applications", application._id.toString(), oldState, application.toObject());

    return serializeCasApplication(application);
}

export async function submitCasApplication(actor: SafeActor, id: string) {
    const application = await getCasApplicationDocumentById(actor, id);
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
    await upsertWorkflow("CAS", application._id.toString(), "Director", application.status, "CAS submitted.");
    await audit(actor, "CAS_SUBMIT", "cas_applications", application._id.toString());

    return serializeCasApplication(application);
}

export async function reviewCasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = casReviewSchema.parse(rawInput);
    const application = await getCasApplicationDocumentById(actor, id);

    const faculty = await getUserForApplication(application);
    const headedDepartment = await getDepartmentHeadedByUser(actor.id);
    const isDepartmentHead =
        Boolean(headedDepartment) && faculty.department === headedDepartment?.name;
    const isCommitteeReviewer = actor.role === "Admin" || actor.role === "Director";

    if (!isDepartmentHead && !isCommitteeReviewer) {
        throw new AuthError("You are not authorized to review this CAS application.", 403);
    }

    if (!["Submitted", "Under Review"].includes(application.status)) {
        throw new AuthError("Only submitted or under-review CAS applications can be reviewed.", 409);
    }

    const reviewStage =
        application.status === "Submitted" ? "Department Head" : "CAS Committee";

    if (reviewStage === "Department Head" && !isDepartmentHead && actor.role !== "Director") {
        throw new AuthError("This CAS application is waiting for department-level review.", 403);
    }

    if (reviewStage === "CAS Committee" && !isCommitteeReviewer) {
        throw new AuthError("This CAS application is waiting for committee review.", 403);
    }

    if (input.decision === "Reject") {
        application.status = "Rejected";
        await recordCasCommitteeReview(application, actor, input, reviewStage);
        pushStatusLog(application, "Rejected", actor, input.remarks);
        await application.save();
        await upsertWorkflow("CAS", application._id.toString(), actor.role, application.status, input.remarks);
        await audit(actor, "CAS_REVIEW_REJECT", "cas_applications", application._id.toString(), undefined, {
            status: application.status,
            remarks: input.remarks,
        });
        return serializeCasApplication(application);
    }

    const nextStatus: CasStatus =
        application.status === "Submitted"
            ? "Under Review"
            : "Committee Review";

    application.status = nextStatus;
    await recordCasCommitteeReview(application, actor, input, reviewStage);
    pushStatusLog(application, nextStatus, actor, input.remarks);
    await application.save();
    await upsertWorkflow(
        "CAS",
        application._id.toString(),
        nextStatus === "Under Review" ? "Director" : "Admin",
        application.status,
        input.remarks
    );
    await audit(actor, "CAS_REVIEW", "cas_applications", application._id.toString(), undefined, {
        status: application.status,
        remarks: input.remarks,
    });

    return serializeCasApplication(application);
}

export async function approveCasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = casApprovalSchema.parse(rawInput);

    if (actor.role !== "Admin") {
        throw new AuthError("Only admin users can finalize CAS approval.", 403);
    }

    const application = await getCasApplicationDocumentById(actor, id);

    if (application.status !== "Committee Review") {
        throw new AuthError("Only committee-reviewed CAS applications can be finalized.", 409);
    }

    application.status = input.decision === "Approve" ? "Approved" : "Rejected";
    await recordCasCommitteeReview(application, actor, input, "Admin");
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

    return serializeCasApplication(application);
}

const CAS_REQUIRED_DOCUMENTS = [
    { documentType: "PBAS_REPORT", label: "PBAS Consolidated Report", isMandatory: true },
    { documentType: "EXPERIENCE_CERT", label: "Experience Certificate", isMandatory: true },
    { documentType: "QUALIFICATION_PROOF", label: "Qualification Proof", isMandatory: true },
];

export async function getCasDocuments(actor: SafeActor, id: string) {
    await dbConnect();
    const application = await getCasApplicationDocumentById(actor, id);

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
    const application = await getCasApplicationDocumentById(actor, id);

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
    const application = await getCasApplicationDocumentById(actor, id);

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
    await ensureCasPromotionRules();

    if (actor.role === "Admin") {
        return CasApplication.find({
            status: "Committee Review",
        }).sort({ updatedAt: -1 });
    }

    if (actor.role === "Director") {
        return CasApplication.find({
            status: { $in: ["Submitted", "Under Review"] },
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
