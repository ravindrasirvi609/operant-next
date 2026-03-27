import { Types } from "mongoose";

import { formatAcademicYearLabel, parseAcademicYearLabel } from "@/lib/academic-year";
import dbConnect from "@/lib/dbConnect";
import { createAuditLog, type AuditRequestContext } from "@/lib/audit/service";
import {
    buildAuthorizedScopeQuery,
    canUseBreakGlassOverride,
    canViewModuleRecord,
    resolveAuthorizationProfile,
    resolveFacultyAuthorizationScope,
} from "@/lib/authorization/service";
import { AuthError } from "@/lib/auth/errors";
import { ensureFacultyContext } from "@/lib/faculty/migration";
import { getFacultyReportDefaults } from "@/lib/faculty/report-defaults";
import Department from "@/models/reference/department";
import Faculty from "@/models/faculty/faculty";
import User from "@/models/core/user";
import CasApplication, { type CasStatus } from "@/models/core/cas-application";
import { casApplicationSchema, casApprovalSchema, casReviewSchema } from "@/lib/cas/validators";
import { getPbasReportsByIdsForFaculty } from "@/lib/pbas/service";
import CasApiScoreBreakup from "@/models/core/cas-api-score-breakup";
import CasPromotionHistory from "@/models/core/cas-promotion-history";
import CasPromotionRule from "@/models/core/cas-promotion-rule";
import FacultyPbasForm from "@/models/core/faculty-pbas-form";
import AcademicYear from "@/models/reference/academic-year";
import CasSupportingDocument from "@/models/core/cas-supporting-document";
import CasScreeningCommitteeMember from "@/models/core/cas-screening-committee";
import DocumentModel from "@/models/reference/document";
import { getDefaultCasTarget } from "@/lib/faculty/options";
import {
    canActorProcessWorkflowStage,
    getActiveWorkflowDefinition,
    getWorkflowInstanceStatus,
    getWorkflowPendingStatuses,
    getWorkflowStageByStatus,
    listPendingWorkflowRecordIds,
    resolveWorkflowTransition,
    syncWorkflowInstanceState,
} from "@/lib/workflow/engine";
import {
    notifyUser,
    notifyWorkflowStageAssignees,
} from "@/lib/notifications/service";

type SafeActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
    auditContext?: AuditRequestContext;
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

async function resolveApplicationYearFromInput(input: {
    applicationYearId?: string;
    applicationYear?: string;
}) {
    const normalizedId = input.applicationYearId?.trim();

    if (normalizedId) {
        if (!Types.ObjectId.isValid(normalizedId)) {
            throw new AuthError("Invalid application year id.", 400);
        }

        const byId = await AcademicYear.findById(normalizedId).select("_id yearStart yearEnd");
        if (!byId) {
            throw new AuthError("Application year not found.", 404);
        }

        return {
            id: byId._id,
            label: formatAcademicYearLabel(byId.yearStart, byId.yearEnd),
        };
    }

    const normalizedLabel = input.applicationYear?.trim();
    const parsed = parseAcademicYearLabel(normalizedLabel);

    if (!parsed) {
        throw new AuthError("Invalid application year label.", 400);
    }

    const byLabel = await AcademicYear.findOne({
        yearStart: parsed.start,
        yearEnd: parsed.end,
    }).select("_id yearStart yearEnd");

    if (!byLabel) {
        throw new AuthError(
            `Application year \"${normalizedLabel}\" is not configured. Add it in Admin > Academics first.`,
            400
        );
    }

    return {
        id: byLabel._id,
        label: formatAcademicYearLabel(byLabel.yearStart, byLabel.yearEnd),
    };
}

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

export async function ensureCasEligibilityReminderForFaculty(
    actor: Pick<SafeActor, "id" | "name" | "role" | "department">
) {
    if (actor.role !== "Faculty") {
        return;
    }

    const eligibility = await getCasEligibilityForFaculty({
        id: actor.id,
        name: actor.name,
        role: actor.role,
        department: actor.department,
    });

    if (!eligibility.eligible || !eligibility.nextDesignation) {
        return;
    }

    const { faculty } = await ensureFacultyContext(actor.id);
    const activeApplication = await CasApplication.findOne({
        facultyId: faculty._id,
        applyingForDesignation: eligibility.nextDesignation,
        status: { $in: ["Draft", "Submitted", "Under Review", "Committee Review"] },
    }).select("_id");

    if (activeApplication) {
        return;
    }

    await notifyUser({
        userId: actor.id,
        kind: "reminder",
        moduleName: "CAS",
        entityId: `eligibility:${eligibility.nextDesignation}`,
        href: "/faculty/cas",
        title: "CAS eligibility unlocked",
        message: `You are now eligible to apply for ${eligibility.nextDesignation}. Open CAS and start your application while your approved PBAS records are current.`,
        metadata: {
            reminderType: "cas_eligibility",
            nextDesignation: eligibility.nextDesignation,
            currentDesignation: eligibility.currentDesignation,
            approvedPbasCount: eligibility.approvedPbasCount,
            lastApprovedYear: eligibility.lastApprovedYear,
            dedupeKey: `cas-eligibility:${eligibility.currentDesignation ?? "unknown"}:${eligibility.nextDesignation}:${eligibility.lastApprovedYear ?? "na"}:${eligibility.approvedPbasCount}`,
            dedupeWindowHours: 24 * 45,
        },
    });
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

async function getCasWorkflowDepartmentName(application: InstanceType<typeof CasApplication>) {
    const faculty = await getUserForApplication(application);
    return faculty.department;
}

async function getCasWorkflowScope(application: InstanceType<typeof CasApplication>) {
    const resolved = await resolveFacultyAuthorizationScope(application.facultyId.toString());

    application.scopeDepartmentId =
        resolved.departmentId && Types.ObjectId.isValid(resolved.departmentId)
            ? new Types.ObjectId(resolved.departmentId)
            : undefined;
    application.scopeInstitutionId =
        resolved.institutionId && Types.ObjectId.isValid(resolved.institutionId)
            ? new Types.ObjectId(resolved.institutionId)
            : undefined;
    application.scopeDepartmentOrganizationId =
        resolved.departmentOrganizationId && Types.ObjectId.isValid(resolved.departmentOrganizationId)
            ? new Types.ObjectId(resolved.departmentOrganizationId)
            : undefined;
    application.scopeCollegeOrganizationId =
        resolved.collegeOrganizationId && Types.ObjectId.isValid(resolved.collegeOrganizationId)
            ? new Types.ObjectId(resolved.collegeOrganizationId)
            : undefined;
    application.scopeUniversityOrganizationId =
        resolved.universityOrganizationId && Types.ObjectId.isValid(resolved.universityOrganizationId)
            ? new Types.ObjectId(resolved.universityOrganizationId)
            : undefined;
    application.scopeOrganizationIds = (resolved.subjectOrganizationIds ?? [])
        .filter((value) => Types.ObjectId.isValid(value))
        .map((value) => new Types.ObjectId(value));

    return resolved;
}

async function upsertWorkflow(
    application: InstanceType<typeof CasApplication>,
    actor: SafeActor | undefined,
    remarks?: string,
    action?: "submit" | "approve" | "reject"
) {
    const subjectScope = await getCasWorkflowScope(application);

    await syncWorkflowInstanceState({
        moduleName: "CAS",
        recordId: application._id.toString(),
        status: application.status,
        subjectDepartmentName: subjectScope.departmentName,
        subjectCollegeName: subjectScope.collegeName,
        subjectUniversityName: subjectScope.universityName,
        subjectDepartmentId: subjectScope.departmentId,
        subjectInstitutionId: subjectScope.institutionId,
        subjectDepartmentOrganizationId: subjectScope.departmentOrganizationId,
        subjectCollegeOrganizationId: subjectScope.collegeOrganizationId,
        subjectUniversityOrganizationId: subjectScope.universityOrganizationId,
        subjectOrganizationIds: subjectScope.subjectOrganizationIds,
        actor,
        remarks,
        action,
    });
}

async function audit(actor: SafeActor | undefined, action: string, tableName: string, recordId?: string, oldData?: unknown, newData?: unknown) {
    await createAuditLog({
        actor,
        action,
        tableName,
        recordId,
        oldData,
        newData,
        auditContext: actor?.auditContext,
    });
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

async function notifyCasStageAssignment(
    application: InstanceType<typeof CasApplication>,
    stage: { key: string; label: string; approverRoles: string[] } | null,
    actor: SafeActor
) {
    if (!stage) {
        return;
    }

    const subjectScope = await getCasWorkflowScope(application);

    await notifyWorkflowStageAssignees({
        stage: {
            key: stage.key,
            label: stage.label,
            approverRoles: stage.approverRoles as Array<"DEPARTMENT_HEAD" | "DIRECTOR" | "OFFICE_HEAD" | "IQAC" | "CAS_COMMITTEE" | "PRINCIPAL" | "FACULTY">,
        },
        subjectDepartmentName: subjectScope.departmentName,
        subjectCollegeName: subjectScope.collegeName,
        subjectUniversityName: subjectScope.universityName,
        moduleName: "CAS",
        entityId: application._id.toString(),
        href: "/director/cas",
        title: `CAS moved to ${stage.label}`,
        message: `${actor.name} moved CAS application ${application.applicationYear} to ${stage.label}.`,
        actor,
    });
}

async function notifyCasFacultyOutcome(
    application: InstanceType<typeof CasApplication>,
    actor: SafeActor,
    decision: "Approve" | "Reject"
) {
    const facultyUser = await getUserForApplication(application);

    await notifyUser({
        userId: facultyUser._id?.toString(),
        moduleName: "CAS",
        entityId: application._id.toString(),
        href: "/faculty/cas",
        title: decision === "Approve" ? "CAS approved" : "CAS returned for changes",
        message:
            decision === "Approve"
                ? `Your CAS application for ${application.applicationYear} was approved by ${actor.name}.`
                : `Your CAS application for ${application.applicationYear} was returned by ${actor.name}. Review remarks and resubmit.`,
        actor,
    });
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

    if (actor.role === "Admin") {
        return application;
    }

    if (actor.role === "Faculty") {
        const { faculty } = await ensureFacultyContext(actor.id);
        if (application.facultyId.toString() === faculty._id.toString()) {
            return application;
        }
    }

    const subjectScope = await getCasWorkflowScope(application);
    const profile = await resolveAuthorizationProfile(actor);

    if (canViewModuleRecord(profile, "CAS", subjectScope)) {
        return application;
    }

    throw new AuthError("You do not have access to this CAS application.", 403);
}

async function recordCasCommitteeReview(
    application: InstanceType<typeof CasApplication>,
    actor: SafeActor,
    input: { remarks: string; decision: string },
    stage: "Department Head" | "CAS Committee" | "Principal" | "Admin"
) {
    const role =
        stage === "Department Head"
            ? "department_head"
            : stage === "Principal"
              ? "chair"
            : stage === "Admin"
              ? "admin"
              : "cas_committee";
    const designation =
        stage === "Department Head"
            ? "Department Head Reviewer"
            : stage === "Principal"
              ? "Principal Final Approver"
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
    const resolvedApplicationYear = await resolveApplicationYearFromInput(input);
    const linkedAchievements = await buildLinkedAchievementsForFaculty(actor.id);
    const apiScore = await computeCasApiScore(faculty._id.toString(), input);
    const eligibility = await evaluateCasEligibility(input, apiScore.totalScore);

    const application = await CasApplication.create({
        facultyId: faculty._id,
        applicationYearId: resolvedApplicationYear.id,
        applicationYear: resolvedApplicationYear.label,
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
    await upsertWorkflow(application, actor, "CAS draft created.");
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
    const resolvedApplicationYear = await resolveApplicationYearFromInput(input);
    const linkedAchievements = await buildLinkedAchievementsForFaculty(actor.id);
    const apiScore = await computeCasApiScore(facultyContext.faculty._id.toString(), input);
    const eligibility = await evaluateCasEligibility(input, apiScore.totalScore);

    application.applicationYearId = resolvedApplicationYear.id;
    application.applicationYear = resolvedApplicationYear.label;
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
    await upsertWorkflow(application, actor, "CAS draft updated.");
    await audit(actor, "CAS_UPDATE", "cas_applications", application._id.toString(), oldState, application.toObject());

    return serializeCasApplication(application);
}

export async function submitCasApplication(actor: SafeActor, id: string) {
    const application = await getCasApplicationDocumentById(actor, id);
    const facultyContext = actor.role === "Faculty" ? await ensureFacultyContext(actor.id) : null;
    const workflowDefinition = await getActiveWorkflowDefinition("CAS");

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

    const submitTransition = resolveWorkflowTransition(workflowDefinition, application.status, "submit");

    application.status = submitTransition.status as CasStatus;
    application.submittedAt = new Date();
    pushStatusLog(
        application,
        submitTransition.status as CasStatus,
        actor,
        "Faculty submitted CAS application."
    );
    await application.save();
    await upsertCasBreakup(application);
    await upsertWorkflow(application, actor, "CAS submitted.", "submit");
    await audit(actor, "CAS_SUBMIT", "cas_applications", application._id.toString());
    await notifyCasStageAssignment(application, submitTransition.stage, actor);

    return serializeCasApplication(application);
}

export async function reviewCasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = casReviewSchema.parse(rawInput);
    const application = await getCasApplicationDocumentById(actor, id);
    const workflowDefinition = await getActiveWorkflowDefinition("CAS");
    const subjectScope = await getCasWorkflowScope(application);
    const isOverride = canUseBreakGlassOverride(actor, "CAS") && Boolean(input.overrideReason?.trim());
    const canReview = await canActorProcessWorkflowStage({
        actor,
        moduleName: "CAS",
        recordId: application._id.toString(),
        status: application.status,
        subjectDepartmentName: subjectScope.departmentName,
        subjectCollegeName: subjectScope.collegeName,
        subjectUniversityName: subjectScope.universityName,
        subjectDepartmentId: subjectScope.departmentId,
        subjectInstitutionId: subjectScope.institutionId,
        subjectDepartmentOrganizationId: subjectScope.departmentOrganizationId,
        subjectCollegeOrganizationId: subjectScope.collegeOrganizationId,
        subjectUniversityOrganizationId: subjectScope.universityOrganizationId,
        subjectOrganizationIds: subjectScope.subjectOrganizationIds,
        stageKinds: ["review"],
    });

    if (!canReview && !isOverride) {
        throw new AuthError("You are not authorized to review this CAS application.", 403);
    }

    const currentStage = getWorkflowStageByStatus(workflowDefinition, application.status);
    if (!currentStage || currentStage.kind !== "review") {
        throw new AuthError("Only submitted or under-review CAS applications can be reviewed.", 409);
    }

    const reviewStage =
        currentStage.key === "department_head_review" ? "Department Head" : "CAS Committee";
    const reviewTransition = resolveWorkflowTransition(
        workflowDefinition,
        application.status,
        input.decision === "Reject" ? "reject" : "approve"
    );

    if (input.decision === "Reject") {
        application.status = reviewTransition.status as CasStatus;
        await recordCasCommitteeReview(application, actor, input, reviewStage);
        pushStatusLog(application, "Rejected", actor, input.remarks);
        await application.save();
        await upsertWorkflow(application, actor, input.remarks, "reject");
        await audit(
            actor,
            isOverride ? "CAS_REVIEW_REJECT_OVERRIDE" : "CAS_REVIEW_REJECT",
            "cas_applications",
            application._id.toString(),
            undefined,
            {
                status: application.status,
                remarks: input.remarks,
                overrideReason: input.overrideReason,
            }
        );
        await notifyCasFacultyOutcome(application, actor, "Reject");
        return serializeCasApplication(application);
    }

    const nextStatus = reviewTransition.status as CasStatus;

    application.status = nextStatus;
    await recordCasCommitteeReview(application, actor, input, reviewStage);
    pushStatusLog(application, nextStatus, actor, input.remarks);
    await application.save();
    await upsertWorkflow(application, actor, input.remarks, "approve");
    await audit(
        actor,
        isOverride ? "CAS_REVIEW_OVERRIDE" : "CAS_REVIEW",
        "cas_applications",
        application._id.toString(),
        undefined,
        {
            status: application.status,
            remarks: input.remarks,
            overrideReason: input.overrideReason,
        }
    );
    await notifyCasStageAssignment(application, reviewTransition.stage, actor);

    return serializeCasApplication(application);
}

export async function approveCasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = casApprovalSchema.parse(rawInput);
    const workflowDefinition = await getActiveWorkflowDefinition("CAS");

    const application = await getCasApplicationDocumentById(actor, id);
    const subjectScope = await getCasWorkflowScope(application);
    const isOverride = canUseBreakGlassOverride(actor, "CAS") && Boolean(input.overrideReason?.trim());
    const canFinalize = await canActorProcessWorkflowStage({
        actor,
        moduleName: "CAS",
        recordId: application._id.toString(),
        status: application.status,
        subjectDepartmentName: subjectScope.departmentName,
        subjectCollegeName: subjectScope.collegeName,
        subjectUniversityName: subjectScope.universityName,
        subjectDepartmentId: subjectScope.departmentId,
        subjectInstitutionId: subjectScope.institutionId,
        subjectDepartmentOrganizationId: subjectScope.departmentOrganizationId,
        subjectCollegeOrganizationId: subjectScope.collegeOrganizationId,
        subjectUniversityOrganizationId: subjectScope.universityOrganizationId,
        subjectOrganizationIds: subjectScope.subjectOrganizationIds,
        stageKinds: ["final"],
    });

    if (!canFinalize && !isOverride) {
        throw new AuthError("Only committee-reviewed CAS applications can be finalized.", 409);
    }

    application.status = resolveWorkflowTransition(
        workflowDefinition,
        application.status,
        input.decision === "Approve" ? "approve" : "reject"
    ).status as CasStatus;
    await recordCasCommitteeReview(application, actor, input, actor.role === "Admin" ? "Admin" : "Principal");
    pushStatusLog(application, application.status, actor, input.remarks);
    await application.save();
    await upsertCasBreakup(application);
    await upsertWorkflow(
        application,
        actor,
        input.remarks,
        input.decision === "Approve" ? "approve" : "reject"
    );
    await audit(
        actor,
        isOverride ? "CAS_APPROVE_OVERRIDE" : "CAS_APPROVE",
        "cas_applications",
        application._id.toString(),
        undefined,
        {
            status: application.status,
            decision: input.decision,
            remarks: input.remarks,
            overrideReason: input.overrideReason,
        }
    );
    await notifyCasFacultyOutcome(application, actor, input.decision);

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
    await upsertWorkflow(application, undefined);

    return getWorkflowInstanceStatus("CAS", application._id.toString());
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

export async function getCasReviewQueue(
    actor: SafeActor,
    options?: { stageKinds?: Array<"review" | "final"> }
) {
    await dbConnect();
    await ensureCasPromotionRules();
    const workflowDefinition = await getActiveWorkflowDefinition("CAS");
    const applications = await CasApplication.find({
        status: { $in: getWorkflowPendingStatuses(workflowDefinition) },
    }).sort({ updatedAt: -1 });

    await Promise.all(applications.map((application) => upsertWorkflow(application, undefined)));

    const recordIds = await listPendingWorkflowRecordIds({
        actor,
        moduleName: "CAS",
        stageKinds: options?.stageKinds,
    });
    const recordIdSet = new Set(recordIds);

    return applications.filter((application) => recordIdSet.has(application._id.toString()));
}

export async function getCasScopedApplications(actor: SafeActor) {
    await dbConnect();
    await ensureCasPromotionRules();
    const profile = await resolveAuthorizationProfile(actor);

    if (!profile.hasLeadershipPortalAccess) {
        return [];
    }

    const applications = await CasApplication.find(buildAuthorizedScopeQuery(profile)).sort({ updatedAt: -1 });

    await Promise.all(applications.map((application) => upsertWorkflow(application, undefined)));

    const [reviewIds, finalIds] = await Promise.all([
        listPendingWorkflowRecordIds({
            actor,
            moduleName: "CAS",
            stageKinds: ["review"],
        }),
        listPendingWorkflowRecordIds({
            actor,
            moduleName: "CAS",
            stageKinds: ["final"],
        }),
    ]);

    const reviewIdSet = new Set(reviewIds);
    const finalIdSet = new Set(finalIds);

    return applications.map((application) => ({
        ...JSON.parse(JSON.stringify(application)),
        permissions: {
            canReview: reviewIdSet.has(application._id.toString()),
            canApprove: finalIdSet.has(application._id.toString()),
            canReject: reviewIdSet.has(application._id.toString()) || finalIdSet.has(application._id.toString()),
            canOverride: profile.isAdmin,
        },
    }));
}
