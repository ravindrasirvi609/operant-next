import { Types } from "mongoose";

import { formatAcademicYearLabel, getAcademicYearReportingPeriod } from "@/lib/academic-year";
import { createAuditLog, type AuditRequestContext } from "@/lib/audit/service";
import { AuthError } from "@/lib/auth/errors";
import {
    buildAuthorizedScopeQuery,
    canViewModuleRecord,
    canListModuleRecords,
    resolveAuthorizationProfile,
    resolveFacultyAuthorizationScope,
} from "@/lib/authorization/service";
import dbConnect from "@/lib/dbConnect";
import {
    canActorProcessWorkflowStage,
    getActiveWorkflowDefinition,
    getWorkflowStageByStatus,
    resolveWorkflowTransition,
    syncWorkflowInstanceState,
} from "@/lib/workflow/engine";
import User from "@/models/core/user";
import GovernanceCommitteeMembership from "@/models/core/governance-committee-membership";
import Faculty from "@/models/faculty/faculty";
import FacultyAdminRole from "@/models/faculty/faculty-admin-role";
import FacultyConsultancy from "@/models/faculty/faculty-consultancy";
import FacultyPatent from "@/models/faculty/faculty-patent";
import FacultyPublication from "@/models/faculty/faculty-publication";
import FacultyResearchProject from "@/models/faculty/faculty-research-project";
import AcademicYear from "@/models/reference/academic-year";
import Department from "@/models/reference/department";
import DocumentModel from "@/models/reference/document";
import Institution from "@/models/reference/institution";
import IntellectualProperty from "@/models/research/intellectual-property";
import Project from "@/models/research/project";
import Publication from "@/models/research/publication";
import ResearchActivity from "@/models/research/research-activity";
import ResearchInnovationActivity from "@/models/research/research-innovation-activity";
import ResearchInnovationAssignment, {
    type IResearchInnovationAssignment,
    type ResearchInnovationWorkflowStatus,
} from "@/models/research/research-innovation-assignment";
import ResearchInnovationGrant from "@/models/research/research-innovation-grant";
import ResearchInnovationPlan from "@/models/research/research-innovation-plan";
import ResearchInnovationStartup from "@/models/research/research-innovation-startup";
import StudentPublication from "@/models/student/student-publication";
import StudentResearchProject from "@/models/student/student-research-project";
import Student from "@/models/student/student";
import {
    researchInnovationAssignmentSchema,
    researchInnovationAssignmentUpdateSchema,
    researchInnovationContributionDraftSchema,
    researchInnovationPlanSchema,
    researchInnovationPlanUpdateSchema,
    researchInnovationReviewSchema,
    type ResearchInnovationContributionDraftInput,
} from "@/lib/research-innovation/validators";

type ResearchInnovationActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
    collegeName?: string;
    universityName?: string;
    auditContext?: AuditRequestContext;
};

type ResearchInnovationScope = {
    departmentName?: string;
    collegeName?: string;
    universityName?: string;
    departmentId?: string;
    institutionId?: string;
    departmentOrganizationId?: string;
    collegeOrganizationId?: string;
    universityOrganizationId?: string;
    subjectOrganizationIds?: string[];
};

type SourceCategory =
    | "facultyPublications"
    | "facultyPatents"
    | "facultyProjects"
    | "facultyConsultancies"
    | "researchPublications"
    | "researchProjects"
    | "intellectualProperties"
    | "researchActivities"
    | "studentPublications"
    | "studentProjects";

type SourceDocumentSummary = {
    id: string;
    fileName?: string;
    fileUrl?: string;
    fileType?: string;
    uploadedAt?: Date;
    verificationStatus?: string;
    verificationRemarks?: string;
};

type SourceOption = {
    id: string;
    title: string;
    subtitle?: string;
    summary?: string;
    ownerLabel?: string;
    documentId?: string;
    document?: SourceDocumentSummary;
    link?: string;
    sourceType: string;
};

type SourceCatalog = Record<SourceCategory, SourceOption[]>;

type HydratedActivity = {
    id: string;
    activityType: string;
    title: string;
    leadName?: string;
    partnerName?: string;
    startDate?: Date;
    endDate?: Date;
    participantCount?: number;
    fundingAmount?: number;
    stage: string;
    outcomeSummary?: string;
    followUpAction?: string;
    documentId?: string;
    document?: SourceDocumentSummary;
};

type HydratedGrant = {
    id: string;
    grantType: string;
    title: string;
    schemeName?: string;
    sponsorName?: string;
    beneficiaryName?: string;
    sanctionedAmount?: number;
    releasedAmount?: number;
    awardDate?: Date;
    stage: string;
    outcomeSummary?: string;
    followUpAction?: string;
    documentId?: string;
    document?: SourceDocumentSummary;
};

type HydratedStartup = {
    id: string;
    startupName: string;
    supportType: string;
    stage: string;
    founderNames?: string;
    sector?: string;
    incubationCell?: string;
    registrationNumber?: string;
    supportStartDate?: Date;
    supportEndDate?: Date;
    fundingAmount?: number;
    outcomeSummary?: string;
    followUpAction?: string;
    documentId?: string;
    document?: SourceDocumentSummary;
};

type HydratedAssignmentRecord = {
    _id: string;
    planId: string;
    planTitle: string;
    academicYearLabel: string;
    scopeType: string;
    focusArea: string;
    unitLabel: string;
    planStatus: string;
    planSummary?: string;
    planStrategyGoals?: string;
    planTargets: {
        publications: number;
        projects: number;
        patents: number;
        consultancies: number;
        studentResearch: number;
        innovationActivities: number;
    };
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: ResearchInnovationWorkflowStatus;
    dueDate?: Date;
    notes?: string;
    researchStrategy?: string;
    fundingPipeline?: string;
    publicationQualityPractices?: string;
    innovationEcosystem?: string;
    incubationSupport?: string;
    consultancyTranslation?: string;
    iprCommercialization?: string;
    studentResearchEngagement?: string;
    collaborationHighlights?: string;
    ethicsAndCompliance?: string;
    supportingLinks: string[];
    documentIds: string[];
    documents: SourceDocumentSummary[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    sourceCatalog: SourceCatalog;
    linkedSources: SourceCatalog;
    sourceMetrics: {
        available: Record<SourceCategory, number>;
        linked: Record<SourceCategory, number>;
        linkedTotal: number;
    };
    activities: HydratedActivity[];
    grants: HydratedGrant[];
    startups: HydratedStartup[];
    reviewHistory: Array<{
        reviewerName?: string;
        reviewerRole?: string;
        stage: string;
        decision: string;
        remarks?: string;
        reviewedAt?: Date;
    }>;
    statusLogs: Array<{
        status: string;
        actorName?: string;
        actorRole?: string;
        remarks?: string;
        changedAt?: Date;
    }>;
    valueSummary: string;
    submittedAt?: Date;
    reviewedAt?: Date;
    approvedAt?: Date;
    updatedAt?: Date;
    scopeDepartmentName?: string;
    scopeCollegeName?: string;
    scopeUniversityName?: string;
    currentStageLabel: string;
    currentStageKind: string | null;
    availableDecisions: string[];
    permissions: {
        canView: boolean;
        canReview: boolean;
        canApprove: boolean;
        canReject: boolean;
    };
};

type ScopedResearchEntities = {
    facultyRows: Array<Record<string, any>>;
    facultyIds: Types.ObjectId[];
    facultyNameById: Map<string, string>;
    userIds: Types.ObjectId[];
    userNameById: Map<string, string>;
    studentRows: Array<Record<string, any>>;
    studentIds: Types.ObjectId[];
    studentNameById: Map<string, string>;
};

const sourceCategoryKeys: SourceCategory[] = [
    "facultyPublications",
    "facultyPatents",
    "facultyProjects",
    "facultyConsultancies",
    "researchPublications",
    "researchProjects",
    "intellectualProperties",
    "researchActivities",
    "studentPublications",
    "studentProjects",
];

function emptySourceCatalog(): SourceCatalog {
    return {
        facultyPublications: [],
        facultyPatents: [],
        facultyProjects: [],
        facultyConsultancies: [],
        researchPublications: [],
        researchProjects: [],
        intellectualProperties: [],
        researchActivities: [],
        studentPublications: [],
        studentProjects: [],
    };
}

function emptySourceCounts() {
    return {
        facultyPublications: 0,
        facultyPatents: 0,
        facultyProjects: 0,
        facultyConsultancies: 0,
        researchPublications: 0,
        researchProjects: 0,
        intellectualProperties: 0,
        researchActivities: 0,
        studentPublications: 0,
        studentProjects: 0,
    } satisfies Record<SourceCategory, number>;
}

function ensureObjectId(id: string, message: string) {
    if (!Types.ObjectId.isValid(id)) {
        throw new AuthError(message, 400);
    }

    return new Types.ObjectId(id);
}

function toOptionalDate(value?: string | null) {
    if (!value?.trim()) {
        return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new AuthError(`Invalid date "${value}".`, 400);
    }

    return parsed;
}

function toOptionalObjectId(value?: string | null) {
    if (!value?.trim()) {
        return undefined;
    }

    return ensureObjectId(value, "Invalid identifier.");
}

function toObjectIdList(values?: string[]) {
    return (values ?? [])
        .filter((value) => Types.ObjectId.isValid(value))
        .map((value) => new Types.ObjectId(value));
}

function uniqueStrings(values: Array<string | undefined | null>) {
    return Array.from(
        new Set(
            values
                .map((value) => String(value ?? "").trim())
                .filter(Boolean)
        )
    );
}

function ensureAdminActor(actor: ResearchInnovationActor) {
    if (actor.role !== "Admin") {
        throw new AuthError("Admin access is required.", 403);
    }
}

function pushStatusLog(
    assignment: InstanceType<typeof ResearchInnovationAssignment>,
    status: ResearchInnovationWorkflowStatus,
    actor?: ResearchInnovationActor,
    remarks?: string
) {
    assignment.statusLogs.push({
        status,
        actorId: actor?.id ? new Types.ObjectId(actor.id) : undefined,
        actorName: actor?.name,
        actorRole: actor?.role,
        remarks,
        changedAt: new Date(),
    });
}

function copyScopeToPlan(
    plan: InstanceType<typeof ResearchInnovationPlan>,
    scope: ResearchInnovationScope
) {
    plan.scopeDepartmentName = scope.departmentName;
    plan.scopeCollegeName = scope.collegeName;
    plan.scopeUniversityName = scope.universityName;
    plan.scopeDepartmentId =
        scope.departmentId && Types.ObjectId.isValid(scope.departmentId)
            ? new Types.ObjectId(scope.departmentId)
            : undefined;
    plan.scopeInstitutionId =
        scope.institutionId && Types.ObjectId.isValid(scope.institutionId)
            ? new Types.ObjectId(scope.institutionId)
            : undefined;
    plan.scopeDepartmentOrganizationId =
        scope.departmentOrganizationId && Types.ObjectId.isValid(scope.departmentOrganizationId)
            ? new Types.ObjectId(scope.departmentOrganizationId)
            : undefined;
    plan.scopeCollegeOrganizationId =
        scope.collegeOrganizationId && Types.ObjectId.isValid(scope.collegeOrganizationId)
            ? new Types.ObjectId(scope.collegeOrganizationId)
            : undefined;
    plan.scopeUniversityOrganizationId =
        scope.universityOrganizationId && Types.ObjectId.isValid(scope.universityOrganizationId)
            ? new Types.ObjectId(scope.universityOrganizationId)
            : undefined;
    plan.scopeOrganizationIds = toObjectIdList(scope.subjectOrganizationIds);
}

function copyScopeToAssignment(
    assignment: InstanceType<typeof ResearchInnovationAssignment>,
    scope: ResearchInnovationScope
) {
    assignment.scopeDepartmentName = scope.departmentName;
    assignment.scopeCollegeName = scope.collegeName;
    assignment.scopeUniversityName = scope.universityName;
    assignment.scopeDepartmentId =
        scope.departmentId && Types.ObjectId.isValid(scope.departmentId)
            ? new Types.ObjectId(scope.departmentId)
            : undefined;
    assignment.scopeInstitutionId =
        scope.institutionId && Types.ObjectId.isValid(scope.institutionId)
            ? new Types.ObjectId(scope.institutionId)
            : undefined;
    assignment.scopeDepartmentOrganizationId =
        scope.departmentOrganizationId && Types.ObjectId.isValid(scope.departmentOrganizationId)
            ? new Types.ObjectId(scope.departmentOrganizationId)
            : undefined;
    assignment.scopeCollegeOrganizationId =
        scope.collegeOrganizationId && Types.ObjectId.isValid(scope.collegeOrganizationId)
            ? new Types.ObjectId(scope.collegeOrganizationId)
            : undefined;
    assignment.scopeUniversityOrganizationId =
        scope.universityOrganizationId && Types.ObjectId.isValid(scope.universityOrganizationId)
            ? new Types.ObjectId(scope.universityOrganizationId)
            : undefined;
    assignment.scopeOrganizationIds = toObjectIdList(scope.subjectOrganizationIds);
}

function mapDocumentRecord(record: Record<string, any>): SourceDocumentSummary {
    return {
        id: record._id.toString(),
        fileName: record.fileName,
        fileUrl: record.fileUrl,
        fileType: record.fileType,
        uploadedAt: record.uploadedAt,
        verificationStatus: record.verificationStatus,
        verificationRemarks: record.verificationRemarks,
    };
}

function buildInRangeOrCreatedFilter(
    primaryField: string,
    range: { startDate: Date; endDate: Date },
    secondaryField?: string
) {
    const clauses: Record<string, unknown>[] = [
        { [primaryField]: { $gte: range.startDate, $lte: range.endDate } },
        { createdAt: { $gte: range.startDate, $lte: range.endDate } },
    ];

    if (secondaryField) {
        clauses.unshift({ [secondaryField]: { $gte: range.startDate, $lte: range.endDate } });
    }

    return { $or: clauses };
}

function buildYearOrCreatedFilter(
    yearField: string,
    academicYearLabel: string,
    range: { startYear: number; endYear: number; startDate: Date; endDate: Date }
) {
    return {
        $or: [
            { [yearField]: academicYearLabel },
            { [yearField]: String(range.startYear) },
            { [yearField]: String(range.endYear) },
            { createdAt: { $gte: range.startDate, $lte: range.endDate } },
        ],
    };
}

function buildAcademicYearRange(label: string) {
    const period = getAcademicYearReportingPeriod(label);
    if (!period) {
        throw new AuthError("Academic year reporting period could not be resolved.", 400);
    }

    const match = label.match(/(\d{4})\D+(\d{4})/);
    if (!match) {
        throw new AuthError("Academic year label is invalid.", 400);
    }

    return {
        startYear: Number(match[1]),
        endYear: Number(match[2]),
        startDate: new Date(`${period.fromDate}T00:00:00.000Z`),
        endDate: new Date(`${period.toDate}T23:59:59.999Z`),
    };
}

function createValueSummary(options: {
    narratives: Record<string, string | undefined>;
    linkedSources: number;
    activities: number;
    evidenceFiles: number;
    supportingLinks: number;
}) {
    const narrativeCount = Object.values(options.narratives).filter((value) => value?.trim()).length;
    return [
        `${narrativeCount}/10 narrative sections`,
        `${options.linkedSources} linked source record(s)`,
        `${options.activities} manual ecosystem row(s)`,
        `${options.evidenceFiles} document(s)`,
        `${options.supportingLinks} supporting link(s)`,
    ].join(" · ");
}

function fullName(value: { firstName?: string; lastName?: string }) {
    return [value.firstName, value.lastName].filter(Boolean).join(" ").trim() || undefined;
}

const researchCoordinatorPattern =
    /(research|innovation|iic|incubat|startup|entrepreneur|ipr|intellectual\s*property|r&d|r\s*&\s*d|consultancy|seed\s*fund|grant)/i;

function buildPlanSubjectScope(planScope: ResearchInnovationScope) {
    return {
        departmentName: planScope.departmentName,
        collegeName: planScope.collegeName,
        universityName: planScope.universityName,
        departmentId: planScope.departmentId,
        institutionId: planScope.institutionId,
        departmentOrganizationId: planScope.departmentOrganizationId,
        collegeOrganizationId: planScope.collegeOrganizationId,
        universityOrganizationId: planScope.universityOrganizationId,
        subjectOrganizationIds: planScope.subjectOrganizationIds,
    };
}

async function createAuditEntry(
    actor: ResearchInnovationActor | undefined,
    action: string,
    tableName: string,
    recordId: string,
    oldData?: unknown,
    newData?: unknown
) {
    if (!actor?.id) {
        return;
    }

    await createAuditLog({
        actor: {
            id: actor.id,
            name: actor.name,
            role: actor.role,
        },
        action,
        tableName,
        recordId,
        oldData,
        newData,
        auditContext: actor.auditContext,
    });
}

async function resolvePlanContext(input: {
    academicYearId: string;
    scopeType: "Department" | "Institution";
    institutionId?: string;
    departmentId?: string;
}) {
    const academicYear = await AcademicYear.findById(input.academicYearId).select(
        "_id yearStart yearEnd"
    );

    if (!academicYear) {
        throw new AuthError("Selected academic year was not found.", 404);
    }

    if (input.scopeType === "Department") {
        if (!input.departmentId) {
            throw new AuthError("Department scope requires a department.", 400);
        }

        const department = await Department.findById(input.departmentId).select(
            "_id name institutionId organizationId"
        );

        if (!department) {
            throw new AuthError("Selected department was not found.", 404);
        }

        const institution = await Institution.findById(
            input.institutionId ?? department.institutionId
        ).select("_id name organizationId");

        if (!institution) {
            throw new AuthError("The department institution was not found.", 404);
        }

        const departmentOrganizationId = department.organizationId?.toString();
        const institutionOrganizationId = institution.organizationId?.toString();

        return {
            academicYear,
            academicYearLabel: formatAcademicYearLabel(
                academicYear.yearStart,
                academicYear.yearEnd
            ),
            department,
            institution,
            scope: {
                departmentName: department.name,
                collegeName: institution.name,
                universityName: institution.name,
                departmentId: department._id.toString(),
                institutionId: institution._id.toString(),
                departmentOrganizationId,
                collegeOrganizationId: institutionOrganizationId,
                universityOrganizationId: institutionOrganizationId,
                subjectOrganizationIds: uniqueStrings([
                    departmentOrganizationId,
                    institutionOrganizationId,
                ]),
            } satisfies ResearchInnovationScope,
        };
    }

    if (!input.institutionId) {
        throw new AuthError("Institution scope requires an institution.", 400);
    }

    const institution = await Institution.findById(input.institutionId).select(
        "_id name organizationId"
    );

    if (!institution) {
        throw new AuthError("Selected institution was not found.", 404);
    }

    const institutionOrganizationId = institution.organizationId?.toString();

    return {
        academicYear,
        academicYearLabel: formatAcademicYearLabel(
            academicYear.yearStart,
            academicYear.yearEnd
        ),
        department: null,
        institution,
        scope: {
            collegeName: institution.name,
            universityName: institution.name,
            institutionId: institution._id.toString(),
            collegeOrganizationId: institutionOrganizationId,
            universityOrganizationId: institutionOrganizationId,
            subjectOrganizationIds: uniqueStrings([institutionOrganizationId]),
        } satisfies ResearchInnovationScope,
    };
}

async function loadPlanCore(planId: string) {
    if (!Types.ObjectId.isValid(planId)) {
        throw new AuthError("Research & innovation plan is invalid.", 400);
    }

    const plan = await ResearchInnovationPlan.findById(planId);
    if (!plan) {
        throw new AuthError("Research & innovation plan was not found.", 404);
    }

    const context = await resolvePlanContext({
        academicYearId: plan.academicYearId.toString(),
        scopeType: plan.scopeType,
        institutionId: plan.institutionId?.toString(),
        departmentId: plan.departmentId?.toString(),
    });

    return { plan, ...context };
}

async function loadAssignmentCore(assignmentId: string) {
    if (!Types.ObjectId.isValid(assignmentId)) {
        throw new AuthError("Research & innovation assignment is invalid.", 400);
    }

    const assignment = await ResearchInnovationAssignment.findById(assignmentId);
    if (!assignment) {
        throw new AuthError("Research & innovation assignment was not found.", 404);
    }

    const { plan, ...context } = await loadPlanCore(assignment.planId.toString());
    return { assignment, plan, ...context };
}

async function ensureEligibleResearchContributor(
    userId: string,
    options: {
        planScope: ResearchInnovationScope;
        planAcademicYearId?: string;
        planFacultyOwnerUserId?: string;
    }
) {
    const user = await User.findById(userId).select(
        "name email role facultyId departmentId institutionId accountStatus isActive department collegeName universityName"
    );

    if (!user) {
        throw new AuthError("The selected faculty user was not found.", 404);
    }

    if (user.role !== "Faculty" || !user.isActive || user.accountStatus !== "Active") {
        throw new AuthError(
            "Only active faculty users can be assigned research & innovation work.",
            400
        );
    }

    const facultyScope = user.facultyId
        ? await resolveFacultyAuthorizationScope(user.facultyId.toString())
        : {
              departmentId: user.departmentId?.toString(),
              institutionId: user.institutionId?.toString(),
          };

    if (
        options.planScope.departmentId &&
        facultyScope.departmentId &&
        options.planScope.departmentId !== facultyScope.departmentId
    ) {
        throw new AuthError(
            "The selected faculty user is outside the department scope of this plan.",
            400
        );
    }

    if (
        options.planScope.institutionId &&
        facultyScope.institutionId &&
        options.planScope.institutionId !== facultyScope.institutionId
    ) {
        throw new AuthError(
            "The selected faculty user is outside the institution scope of this plan.",
            400
        );
    }

    if (options.planFacultyOwnerUserId && options.planFacultyOwnerUserId === user._id.toString()) {
        return user;
    }

    const subjectScope = buildPlanSubjectScope(options.planScope);
    const adminRoleFilter = user.facultyId
        ? {
              facultyId: user.facultyId,
              $or: [
                  ...(options.planAcademicYearId
                      ? [{ academicYearId: new Types.ObjectId(options.planAcademicYearId) }]
                      : []),
                  { academicYearId: { $exists: false } },
                  { academicYearId: null },
              ],
          }
        : null;

    const [authorizationProfile, adminRoles, researchMemberships] = await Promise.all([
        resolveAuthorizationProfile({
            id: user._id.toString(),
            name: user.name,
            role: user.role,
            department: user.department,
            collegeName: user.collegeName,
            universityName: user.universityName,
        }),
        adminRoleFilter
            ? FacultyAdminRole.find(adminRoleFilter)
                  .select("roleName committeeName")
                  .lean()
            : [],
        GovernanceCommitteeMembership.find({
            userId: user._id,
            isActive: true,
            $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: new Date() } }],
        })
            .populate("committeeId", "committeeType")
            .select("committeeId")
            .lean(),
    ]);

    const hasResearchAdminRole = adminRoles.some((role) =>
        researchCoordinatorPattern.test(
            `${role.roleName ?? ""} ${role.committeeName ?? ""}`
        )
    );
    const hasScopedGovernanceRole =
        canViewModuleRecord(authorizationProfile, "RESEARCH_INNOVATION", subjectScope) &&
        authorizationProfile.workflowRoles.some((role) =>
            ["RESEARCH_COMMITTEE", "DEPARTMENT_HEAD", "DIRECTOR", "PRINCIPAL"].includes(role)
        );
    const hasResearchCommitteeMembership =
        canViewModuleRecord(authorizationProfile, "RESEARCH_INNOVATION", subjectScope) &&
        researchMemberships.some((membership) => {
            const committee = membership.committeeId as { committeeType?: string } | null;
            return committee?.committeeType === "RESEARCH_COMMITTEE";
        });

    if (!hasResearchAdminRole && !hasScopedGovernanceRole && !hasResearchCommitteeMembership) {
        throw new AuthError(
            "Only the plan owner or an active scoped research coordinator can be assigned to this research & innovation portfolio.",
            400
        );
    }

    return user;
}

async function loadScopedEntitiesForPlan(
    plan: Pick<
        InstanceType<typeof ResearchInnovationPlan>,
        "scopeType" | "institutionId" | "departmentId"
    >
): Promise<ScopedResearchEntities> {
    const facultyFilter =
        plan.scopeType === "Department" && plan.departmentId
            ? { departmentId: plan.departmentId, status: "Active" }
            : plan.institutionId
              ? { institutionId: plan.institutionId, status: "Active" }
              : { _id: { $in: [] as Types.ObjectId[] } };

    const studentFilter =
        plan.scopeType === "Department" && plan.departmentId
            ? { departmentId: plan.departmentId, status: { $in: ["Active", "Graduated"] } }
            : plan.institutionId
              ? { institutionId: plan.institutionId, status: { $in: ["Active", "Graduated"] } }
              : { _id: { $in: [] as Types.ObjectId[] } };

    const [facultyRows, studentRows] = await Promise.all([
        Faculty.find(facultyFilter)
            .select("_id userId firstName lastName")
            .lean(),
        Student.find(studentFilter)
            .select("_id firstName lastName enrollmentNo")
            .lean(),
    ]);

    const facultyIds = facultyRows.map((row) => row._id as Types.ObjectId);
    const userIds = facultyRows
        .map((row) => row.userId)
        .filter((value): value is Types.ObjectId => Boolean(value));
    const studentIds = studentRows.map((row) => row._id as Types.ObjectId);

    const userNames = userIds.length
        ? await User.find({ _id: { $in: userIds } }).select("name").lean()
        : [];

    return {
        facultyRows,
        facultyIds,
        facultyNameById: new Map(
            facultyRows.map((row) => [row._id.toString(), fullName(row) ?? row._id.toString()])
        ),
        userIds,
        userNameById: new Map(userNames.map((row) => [row._id.toString(), row.name])),
        studentRows,
        studentIds,
        studentNameById: new Map(
            studentRows.map((row) => [
                row._id.toString(),
                fullName(row) ?? row.enrollmentNo ?? row._id.toString(),
            ])
        ),
    };
}

function formatCurrency(value?: number | null) {
    if (value === undefined || value === null) {
        return undefined;
    }

    return `INR ${value.toLocaleString("en-IN")}`;
}

async function buildSourceCatalogForPlan(
    plan: Pick<
        InstanceType<typeof ResearchInnovationPlan>,
        "academicYearId" | "scopeType" | "institutionId" | "departmentId"
    > & { academicYearLabel?: string }
): Promise<SourceCatalog> {
    const academicYear =
        plan.academicYearLabel ||
        (
            await AcademicYear.findById(plan.academicYearId).select("yearStart yearEnd")
        )?.toObject();

    const academicYearLabel =
        typeof academicYear === "string"
            ? academicYear
            : academicYear && "yearStart" in academicYear
              ? formatAcademicYearLabel(academicYear.yearStart, academicYear.yearEnd)
              : "";

    if (!academicYearLabel) {
        return emptySourceCatalog();
    }

    const range = buildAcademicYearRange(academicYearLabel);
    const scoped = await loadScopedEntitiesForPlan(plan);

    const [
        facultyPublications,
        facultyPatents,
        facultyProjects,
        facultyConsultancies,
        researchPublications,
        researchProjects,
        intellectualProperties,
        researchActivities,
        studentPublications,
        studentProjects,
    ] = await Promise.all([
        scoped.facultyIds.length
            ? FacultyPublication.find({
                  facultyId: { $in: scoped.facultyIds },
                  ...buildInRangeOrCreatedFilter("publicationDate", range),
              })
                  .sort({ publicationDate: -1, updatedAt: -1 })
                  .lean()
            : [],
        scoped.facultyIds.length
            ? FacultyPatent.find({
                  facultyId: { $in: scoped.facultyIds },
                  ...buildInRangeOrCreatedFilter("filingDate", range, "grantDate"),
              })
                  .sort({ filingDate: -1, updatedAt: -1 })
                  .lean()
            : [],
        scoped.facultyIds.length
            ? FacultyResearchProject.find({
                  facultyId: { $in: scoped.facultyIds },
                  ...buildInRangeOrCreatedFilter("startDate", range, "endDate"),
              })
                  .sort({ startDate: -1, updatedAt: -1 })
                  .lean()
            : [],
        scoped.facultyIds.length
            ? FacultyConsultancy.find({
                  facultyId: { $in: scoped.facultyIds },
                  ...buildInRangeOrCreatedFilter("startDate", range, "endDate"),
              })
                  .sort({ startDate: -1, updatedAt: -1 })
                  .lean()
            : [],
        scoped.userIds.length
            ? Publication.find({
                  userId: { $in: scoped.userIds },
                  ...buildYearOrCreatedFilter("year", academicYearLabel, range),
              })
                  .sort({ year: -1, updatedAt: -1 })
                  .lean()
            : [],
        scoped.userIds.length
            ? Project.find({
                  userId: { $in: scoped.userIds },
                  ...buildInRangeOrCreatedFilter("fromDate", range, "toDate"),
              })
                  .sort({ fromDate: -1, updatedAt: -1 })
                  .lean()
            : [],
        scoped.userIds.length
            ? IntellectualProperty.find({
                  userId: { $in: scoped.userIds },
                  ...buildYearOrCreatedFilter("year", academicYearLabel, range),
              })
                  .sort({ year: -1, updatedAt: -1 })
                  .lean()
            : [],
        scoped.userIds.length
            ? ResearchActivity.find({
                  userId: { $in: scoped.userIds },
                  ...buildYearOrCreatedFilter("year", academicYearLabel, range),
              })
                  .sort({ year: -1, updatedAt: -1 })
                  .lean()
            : [],
        scoped.studentIds.length
            ? StudentPublication.find({
                  studentId: { $in: scoped.studentIds },
                  ...buildInRangeOrCreatedFilter("publicationDate", range),
              })
                  .sort({ publicationDate: -1, updatedAt: -1 })
                  .lean()
            : [],
        scoped.studentIds.length
            ? StudentResearchProject.find({
                  studentId: { $in: scoped.studentIds },
                  ...buildInRangeOrCreatedFilter("startDate", range, "endDate"),
              })
                  .sort({ startDate: -1, updatedAt: -1 })
                  .lean()
            : [],
    ]);

    const documentIds = uniqueStrings([
        ...facultyPublications.map((row) => row.documentId?.toString()),
        ...facultyPatents.map((row) => row.documentId?.toString()),
        ...facultyProjects.map((row) => row.documentId?.toString()),
        ...facultyConsultancies.map((row) => row.documentId?.toString()),
        ...studentPublications.map((row) => row.documentId?.toString()),
        ...studentProjects.map((row) => row.documentId?.toString()),
    ]);

    const documents = documentIds.length
        ? await DocumentModel.find({ _id: { $in: toObjectIdList(documentIds) } }).lean()
        : [];
    const documentById = new Map(
        documents.map((row) => [row._id.toString(), mapDocumentRecord(row)])
    );

    return {
        facultyPublications: facultyPublications.map((row) => ({
            id: row._id.toString(),
            title: row.title,
            subtitle: row.journalName ?? row.publisher ?? row.publicationType,
            summary: [
                row.publicationType,
                row.indexedIn,
                row.authorPosition,
                row.publicationDate
                    ? new Date(row.publicationDate).toLocaleDateString("en-IN")
                    : undefined,
            ]
                .filter(Boolean)
                .join(" · "),
            ownerLabel: scoped.facultyNameById.get(row.facultyId.toString()),
            documentId: row.documentId?.toString(),
            document: row.documentId
                ? documentById.get(row.documentId.toString())
                : undefined,
            link: row.doi ? `https://doi.org/${row.doi}` : undefined,
            sourceType: "FacultyPublication",
        })),
        facultyPatents: facultyPatents.map((row) => ({
            id: row._id.toString(),
            title: row.title,
            subtitle: row.status,
            summary: [
                row.patentNumber,
                row.filingDate
                    ? new Date(row.filingDate).toLocaleDateString("en-IN")
                    : undefined,
            ]
                .filter(Boolean)
                .join(" · "),
            ownerLabel: scoped.facultyNameById.get(row.facultyId.toString()),
            documentId: row.documentId?.toString(),
            document: row.documentId
                ? documentById.get(row.documentId.toString())
                : undefined,
            sourceType: "FacultyPatent",
        })),
        facultyProjects: facultyProjects.map((row) => ({
            id: row._id.toString(),
            title: row.title,
            subtitle: row.fundingAgency ?? row.projectType,
            summary: [
                row.projectType,
                row.status,
                row.principalInvestigator ? "PI" : "Co-investigator",
                formatCurrency(row.amountSanctioned),
            ]
                .filter(Boolean)
                .join(" · "),
            ownerLabel: scoped.facultyNameById.get(row.facultyId.toString()),
            documentId: row.documentId?.toString(),
            document: row.documentId
                ? documentById.get(row.documentId.toString())
                : undefined,
            sourceType: "FacultyResearchProject",
        })),
        facultyConsultancies: facultyConsultancies.map((row) => ({
            id: row._id.toString(),
            title: row.projectTitle,
            subtitle: row.clientName,
            summary: [
                formatCurrency(row.revenueGenerated),
                row.startDate
                    ? new Date(row.startDate).toLocaleDateString("en-IN")
                    : undefined,
            ]
                .filter(Boolean)
                .join(" · "),
            ownerLabel: scoped.facultyNameById.get(row.facultyId.toString()),
            documentId: row.documentId?.toString(),
            document: row.documentId
                ? documentById.get(row.documentId.toString())
                : undefined,
            sourceType: "FacultyConsultancy",
        })),
        researchPublications: researchPublications.map((row) => ({
            id: row._id.toString(),
            title: row.title,
            subtitle: row.journalOrBookName,
            summary: [
                row.type,
                row.year,
                row.indexing?.join(", "),
                row.impactFactor ? `IF ${row.impactFactor}` : undefined,
            ]
                .filter(Boolean)
                .join(" · "),
            ownerLabel: scoped.userNameById.get(row.userId.toString()),
            link: row.link || row.uploadProof || (row.doi ? `https://doi.org/${row.doi}` : undefined),
            sourceType: "Publication",
        })),
        researchProjects: researchProjects.map((row) => ({
            id: row._id.toString(),
            title: row.title,
            subtitle: row.agencyName,
            summary: [
                row.type,
                row.agencyType,
                row.status,
                row.providedFunds ? `Funds ${row.providedFunds}` : undefined,
            ]
                .filter(Boolean)
                .join(" · "),
            ownerLabel: scoped.userNameById.get(row.userId.toString()),
            link: row.uploadProof,
            sourceType: "Project",
        })),
        intellectualProperties: intellectualProperties.map((row) => ({
            id: row._id.toString(),
            title: row.title,
            subtitle: row.type,
            summary: [row.status, row.registrationNo, row.year].filter(Boolean).join(" · "),
            ownerLabel: scoped.userNameById.get(row.userId.toString()),
            link: row.link || row.uploadProof,
            sourceType: "IntellectualProperty",
        })),
        researchActivities: researchActivities.map((row) => ({
            id: row._id.toString(),
            title: row.title || row.scholarName,
            subtitle: row.type,
            summary: [
                row.scholarName,
                row.status,
                row.fundingAgency,
                row.year,
            ]
                .filter(Boolean)
                .join(" · "),
            ownerLabel: scoped.userNameById.get(row.userId.toString()),
            link: row.uploadProof,
            sourceType: "ResearchActivity",
        })),
        studentPublications: studentPublications.map((row) => ({
            id: row._id.toString(),
            title: row.title,
            subtitle: row.journalName ?? row.publisher ?? row.publicationType,
            summary: [row.indexedIn, row.doi].filter(Boolean).join(" · "),
            ownerLabel: scoped.studentNameById.get(row.studentId.toString()),
            documentId: row.documentId?.toString(),
            document: row.documentId
                ? documentById.get(row.documentId.toString())
                : undefined,
            link: row.doi ? `https://doi.org/${row.doi}` : undefined,
            sourceType: "StudentPublication",
        })),
        studentProjects: studentProjects.map((row) => ({
            id: row._id.toString(),
            title: row.title,
            subtitle: row.guideName ?? row.status,
            summary: [row.status, row.description].filter(Boolean).join(" · "),
            ownerLabel: scoped.studentNameById.get(row.studentId.toString()),
            documentId: row.documentId?.toString(),
            document: row.documentId
                ? documentById.get(row.documentId.toString())
                : undefined,
            sourceType: "StudentResearchProject",
        })),
    };
}

function selectedIdsByCategory(
    assignment: Pick<
        IResearchInnovationAssignment,
        | "facultyPublicationIds"
        | "facultyPatentIds"
        | "facultyResearchProjectIds"
        | "facultyConsultancyIds"
        | "researchPublicationIds"
        | "researchProjectIds"
        | "intellectualPropertyIds"
        | "researchActivityIds"
        | "studentPublicationIds"
        | "studentResearchProjectIds"
    >
) {
    return {
        facultyPublications: assignment.facultyPublicationIds.map((value) => value.toString()),
        facultyPatents: assignment.facultyPatentIds.map((value) => value.toString()),
        facultyProjects: assignment.facultyResearchProjectIds.map((value) => value.toString()),
        facultyConsultancies: assignment.facultyConsultancyIds.map((value) => value.toString()),
        researchPublications: assignment.researchPublicationIds.map((value) => value.toString()),
        researchProjects: assignment.researchProjectIds.map((value) => value.toString()),
        intellectualProperties: assignment.intellectualPropertyIds.map((value) => value.toString()),
        researchActivities: assignment.researchActivityIds.map((value) => value.toString()),
        studentPublications: assignment.studentPublicationIds.map((value) => value.toString()),
        studentProjects: assignment.studentResearchProjectIds.map((value) => value.toString()),
    } satisfies Record<SourceCategory, string[]>;
}

function buildLinkedSources(
    assignment: Pick<
        IResearchInnovationAssignment,
        | "facultyPublicationIds"
        | "facultyPatentIds"
        | "facultyResearchProjectIds"
        | "facultyConsultancyIds"
        | "researchPublicationIds"
        | "researchProjectIds"
        | "intellectualPropertyIds"
        | "researchActivityIds"
        | "studentPublicationIds"
        | "studentResearchProjectIds"
    >,
    sourceCatalog: SourceCatalog
) {
    const selected = selectedIdsByCategory(assignment);
    const linked = emptySourceCatalog();

    for (const key of sourceCategoryKeys) {
        const selectedIds = new Set(selected[key]);
        linked[key] = sourceCatalog[key].filter((item) => selectedIds.has(item.id));
    }

    return linked;
}

function validateSelectedSources(
    input: ResearchInnovationContributionDraftInput,
    sourceCatalog: SourceCatalog
) {
    const selected: Record<SourceCategory, string[]> = {
        facultyPublications: input.facultyPublicationIds,
        facultyPatents: input.facultyPatentIds,
        facultyProjects: input.facultyResearchProjectIds,
        facultyConsultancies: input.facultyConsultancyIds,
        researchPublications: input.researchPublicationIds,
        researchProjects: input.researchProjectIds,
        intellectualProperties: input.intellectualPropertyIds,
        researchActivities: input.researchActivityIds,
        studentPublications: input.studentPublicationIds,
        studentProjects: input.studentResearchProjectIds,
    };

    for (const key of sourceCategoryKeys) {
        const validIds = new Set(sourceCatalog[key].map((item) => item.id));
        const invalid = selected[key].find((value) => !validIds.has(value));
        if (invalid) {
            throw new AuthError(
                `A selected ${key} record is outside the current plan scope or academic year.`,
                400
            );
        }
    }
}

async function syncActivities(
    assignment: InstanceType<typeof ResearchInnovationAssignment>,
    input: ResearchInnovationContributionDraftInput
) {
    const existingRows = await ResearchInnovationActivity.find({
        assignmentId: assignment._id,
    });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.activities.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            activityType: row.activityType,
            title: row.title,
            leadName: row.leadName || undefined,
            partnerName: row.partnerName || undefined,
            startDate: toOptionalDate(row.startDate),
            endDate: toOptionalDate(row.endDate),
            participantCount: row.participantCount,
            fundingAmount: row.fundingAmount,
            stage: row.stage,
            outcomeSummary: row.outcomeSummary || undefined,
            followUpAction: row.followUpAction || undefined,
            documentId: toOptionalObjectId(row.documentId),
            displayOrder: row.displayOrder || index + 1,
        };

        if (row._id) {
            const existing = existingById.get(row._id);
            if (!existing) {
                throw new AuthError("An innovation activity entry could not be matched.", 400);
            }

            existing.set(payload);
            await existing.save();
            keepIds.add(existing._id.toString());
            continue;
        }

        const created = await ResearchInnovationActivity.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await ResearchInnovationActivity.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function syncGrants(
    assignment: InstanceType<typeof ResearchInnovationAssignment>,
    input: ResearchInnovationContributionDraftInput
) {
    const existingRows = await ResearchInnovationGrant.find({
        assignmentId: assignment._id,
    });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.grants.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            grantType: row.grantType,
            title: row.title,
            schemeName: row.schemeName || undefined,
            sponsorName: row.sponsorName || undefined,
            beneficiaryName: row.beneficiaryName || undefined,
            sanctionedAmount: row.sanctionedAmount,
            releasedAmount: row.releasedAmount,
            awardDate: toOptionalDate(row.awardDate),
            stage: row.stage,
            outcomeSummary: row.outcomeSummary || undefined,
            followUpAction: row.followUpAction || undefined,
            documentId: toOptionalObjectId(row.documentId),
            displayOrder: row.displayOrder || index + 1,
        };

        if (row._id) {
            const existing = existingById.get(row._id);
            if (!existing) {
                throw new AuthError("A grant entry could not be matched.", 400);
            }

            existing.set(payload);
            await existing.save();
            keepIds.add(existing._id.toString());
            continue;
        }

        const created = await ResearchInnovationGrant.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await ResearchInnovationGrant.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function syncStartups(
    assignment: InstanceType<typeof ResearchInnovationAssignment>,
    input: ResearchInnovationContributionDraftInput
) {
    const existingRows = await ResearchInnovationStartup.find({
        assignmentId: assignment._id,
    });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.startups.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            startupName: row.startupName,
            supportType: row.supportType,
            stage: row.stage,
            founderNames: row.founderNames || undefined,
            sector: row.sector || undefined,
            incubationCell: row.incubationCell || undefined,
            registrationNumber: row.registrationNumber || undefined,
            supportStartDate: toOptionalDate(row.supportStartDate),
            supportEndDate: toOptionalDate(row.supportEndDate),
            fundingAmount: row.fundingAmount,
            outcomeSummary: row.outcomeSummary || undefined,
            followUpAction: row.followUpAction || undefined,
            documentId: toOptionalObjectId(row.documentId),
            displayOrder: row.displayOrder || index + 1,
        };

        if (row._id) {
            const existing = existingById.get(row._id);
            if (!existing) {
                throw new AuthError("A startup incubation entry could not be matched.", 400);
            }

            existing.set(payload);
            await existing.save();
            keepIds.add(existing._id.toString());
            continue;
        }

        const created = await ResearchInnovationStartup.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await ResearchInnovationStartup.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function hydrateAssignments(
    assignments: Array<Record<string, any>>,
    actor?: ResearchInnovationActor
) {
    const planIds = uniqueStrings(assignments.map((row) => row.planId?.toString()));
    const assigneeIds = uniqueStrings(assignments.map((row) => row.assigneeUserId?.toString()));
    const assignmentIds = uniqueStrings(assignments.map((row) => row._id?.toString()));

    const [plans, assignees, activities, grants, startups] = await Promise.all([
        planIds.length
            ? ResearchInnovationPlan.find({ _id: { $in: toObjectIdList(planIds) } })
                  .populate("academicYearId", "yearStart yearEnd")
                  .populate("institutionId", "name")
                  .populate("departmentId", "name")
                  .lean()
            : [],
        assigneeIds.length
            ? User.find({ _id: { $in: toObjectIdList(assigneeIds) } })
                  .select("name email role")
                  .lean()
            : [],
        assignmentIds.length
            ? ResearchInnovationActivity.find({
                  assignmentId: { $in: toObjectIdList(assignmentIds) },
              })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? ResearchInnovationGrant.find({
                  assignmentId: { $in: toObjectIdList(assignmentIds) },
              })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? ResearchInnovationStartup.find({
                  assignmentId: { $in: toObjectIdList(assignmentIds) },
              })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
    ]);

    const planById = new Map(plans.map((row) => [row._id.toString(), row]));
    const assigneeById = new Map(assignees.map((row) => [row._id.toString(), row]));

    const planCatalogEntries = await Promise.all(
        Array.from(planById.values()).map(async (plan) => {
            const academicYearRef = plan.academicYearId as Record<string, any>;
            const label =
                academicYearRef && "yearStart" in academicYearRef
                    ? formatAcademicYearLabel(academicYearRef.yearStart, academicYearRef.yearEnd)
                    : "";

            const catalog = await buildSourceCatalogForPlan({
                academicYearId:
                    academicYearRef && "_id" in academicYearRef
                        ? academicYearRef._id
                        : plan.academicYearId,
                scopeType: plan.scopeType,
                institutionId:
                    plan.institutionId && typeof plan.institutionId === "object" && "_id" in plan.institutionId
                        ? plan.institutionId._id
                        : plan.institutionId,
                departmentId:
                    plan.departmentId && typeof plan.departmentId === "object" && "_id" in plan.departmentId
                        ? plan.departmentId._id
                        : plan.departmentId,
                academicYearLabel: label,
            });

            return [plan._id.toString(), catalog] as const;
        })
    );

    const sourceCatalogByPlan = new Map(planCatalogEntries);
    const activityByAssignmentId = new Map<string, Array<Record<string, any>>>();
    const grantByAssignmentId = new Map<string, Array<Record<string, any>>>();
    const startupByAssignmentId = new Map<string, Array<Record<string, any>>>();
    activities.forEach((row) => {
        const key = row.assignmentId.toString();
        const current = activityByAssignmentId.get(key) ?? [];
        current.push(row);
        activityByAssignmentId.set(key, current);
    });
    grants.forEach((row) => {
        const key = row.assignmentId.toString();
        const current = grantByAssignmentId.get(key) ?? [];
        current.push(row);
        grantByAssignmentId.set(key, current);
    });
    startups.forEach((row) => {
        const key = row.assignmentId.toString();
        const current = startupByAssignmentId.get(key) ?? [];
        current.push(row);
        startupByAssignmentId.set(key, current);
    });

    const activityDocumentIds = uniqueStrings(
        activities.map((row) => row.documentId?.toString())
    );
    const grantDocumentIds = uniqueStrings(
        grants.map((row) => row.documentId?.toString())
    );
    const startupDocumentIds = uniqueStrings(
        startups.map((row) => row.documentId?.toString())
    );
    const manualDocumentIds = uniqueStrings(
        assignments.flatMap((row) => (row.documentIds ?? []).map((value: Types.ObjectId) => value.toString()))
    );

    const activityDocuments = [
        ...activityDocumentIds,
        ...grantDocumentIds,
        ...startupDocumentIds,
        ...manualDocumentIds,
    ];
    const documents = activityDocuments.length
        ? await DocumentModel.find({ _id: { $in: toObjectIdList(activityDocuments) } }).lean()
        : [];
    const documentById = new Map(
        documents.map((row) => [row._id.toString(), mapDocumentRecord(row)])
    );

    const workflowDefinition = await getActiveWorkflowDefinition("RESEARCH_INNOVATION");
    const profile = actor ? await resolveAuthorizationProfile(actor) : null;

    return Promise.all(
        assignments.map(async (assignment) => {
            const plan = planById.get(assignment.planId.toString());
            if (!plan) {
                throw new AuthError(
                    "Research & innovation assignment references a missing plan.",
                    400
                );
            }

            const assignee = assigneeById.get(assignment.assigneeUserId.toString());
            const sourceCatalog =
                sourceCatalogByPlan.get(plan._id.toString()) ?? emptySourceCatalog();
            const linkedSources = buildLinkedSources(
                assignment as IResearchInnovationAssignment,
                sourceCatalog
            );
            const linkedCounts = emptySourceCounts();
            for (const key of sourceCategoryKeys) {
                linkedCounts[key] = linkedSources[key].length;
            }

            const activityRows = (activityByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                id: row._id.toString(),
                activityType: row.activityType,
                title: row.title,
                leadName: row.leadName,
                partnerName: row.partnerName,
                startDate: row.startDate,
                endDate: row.endDate,
                participantCount: row.participantCount,
                fundingAmount: row.fundingAmount,
                stage: row.stage,
                outcomeSummary: row.outcomeSummary,
                followUpAction: row.followUpAction,
                documentId: row.documentId?.toString(),
                document: row.documentId
                    ? documentById.get(row.documentId.toString())
                    : undefined,
            }));
            const grantRows = (grantByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                id: row._id.toString(),
                grantType: row.grantType,
                title: row.title,
                schemeName: row.schemeName,
                sponsorName: row.sponsorName,
                beneficiaryName: row.beneficiaryName,
                sanctionedAmount: row.sanctionedAmount,
                releasedAmount: row.releasedAmount,
                awardDate: row.awardDate,
                stage: row.stage,
                outcomeSummary: row.outcomeSummary,
                followUpAction: row.followUpAction,
                documentId: row.documentId?.toString(),
                document: row.documentId
                    ? documentById.get(row.documentId.toString())
                    : undefined,
            }));
            const startupRows = (startupByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                id: row._id.toString(),
                startupName: row.startupName,
                supportType: row.supportType,
                stage: row.stage,
                founderNames: row.founderNames,
                sector: row.sector,
                incubationCell: row.incubationCell,
                registrationNumber: row.registrationNumber,
                supportStartDate: row.supportStartDate,
                supportEndDate: row.supportEndDate,
                fundingAmount: row.fundingAmount,
                outcomeSummary: row.outcomeSummary,
                followUpAction: row.followUpAction,
                documentId: row.documentId?.toString(),
                document: row.documentId
                    ? documentById.get(row.documentId.toString())
                    : undefined,
            }));

            const academicYearRef = plan.academicYearId as Record<string, any> | undefined;
            const academicYearLabel =
                academicYearRef && "yearStart" in academicYearRef
                    ? formatAcademicYearLabel(academicYearRef.yearStart, academicYearRef.yearEnd)
                    : "";
            const institutionRef = plan.institutionId as Record<string, any> | undefined;
            const departmentRef = plan.departmentId as Record<string, any> | undefined;
            const currentStage = getWorkflowStageByStatus(
                workflowDefinition,
                assignment.status
            );
            const canView =
                actor?.role === "Admin"
                    ? true
                    : profile
                      ? canViewModuleRecord(profile, "RESEARCH_INNOVATION", {
                            departmentName: assignment.scopeDepartmentName,
                            collegeName: assignment.scopeCollegeName,
                            universityName: assignment.scopeUniversityName,
                            departmentId: assignment.scopeDepartmentId?.toString(),
                            institutionId: assignment.scopeInstitutionId?.toString(),
                            departmentOrganizationId:
                                assignment.scopeDepartmentOrganizationId?.toString(),
                            collegeOrganizationId:
                                assignment.scopeCollegeOrganizationId?.toString(),
                            universityOrganizationId:
                                assignment.scopeUniversityOrganizationId?.toString(),
                            subjectOrganizationIds:
                                assignment.scopeOrganizationIds?.map((value: Types.ObjectId) =>
                                    value.toString()
                                ) ?? [],
                        })
                      : false;

            const canReview =
                actor && currentStage
                    ? await canActorProcessWorkflowStage({
                          actor,
                          moduleName: "RESEARCH_INNOVATION",
                          recordId: assignment._id.toString(),
                          status: assignment.status,
                          subjectDepartmentName: assignment.scopeDepartmentName,
                          subjectCollegeName: assignment.scopeCollegeName,
                          subjectUniversityName: assignment.scopeUniversityName,
                          subjectDepartmentId: assignment.scopeDepartmentId?.toString(),
                          subjectInstitutionId: assignment.scopeInstitutionId?.toString(),
                          subjectDepartmentOrganizationId:
                              assignment.scopeDepartmentOrganizationId?.toString(),
                          subjectCollegeOrganizationId:
                              assignment.scopeCollegeOrganizationId?.toString(),
                          subjectUniversityOrganizationId:
                              assignment.scopeUniversityOrganizationId?.toString(),
                          subjectOrganizationIds:
                              assignment.scopeOrganizationIds?.map((value: Types.ObjectId) =>
                                  value.toString()
                              ) ?? [],
                          stageKinds: [currentStage.kind],
                      })
                    : false;

            const manualDocuments = (assignment.documentIds ?? [])
                .map((value: Types.ObjectId) => documentById.get(value.toString()))
                .filter(Boolean) as SourceDocumentSummary[];

            const linkedTotal = sourceCategoryKeys.reduce(
                (sum, key) => sum + linkedCounts[key],
                0
            );
            const availableCounts = emptySourceCounts();
            for (const key of sourceCategoryKeys) {
                availableCounts[key] = sourceCatalog[key].length;
            }

            const valueSummary = createValueSummary({
                narratives: {
                    researchStrategy: assignment.researchStrategy,
                    fundingPipeline: assignment.fundingPipeline,
                    publicationQualityPractices: assignment.publicationQualityPractices,
                    innovationEcosystem: assignment.innovationEcosystem,
                    incubationSupport: assignment.incubationSupport,
                    consultancyTranslation: assignment.consultancyTranslation,
                    iprCommercialization: assignment.iprCommercialization,
                    studentResearchEngagement: assignment.studentResearchEngagement,
                    collaborationHighlights: assignment.collaborationHighlights,
                    ethicsAndCompliance: assignment.ethicsAndCompliance,
                },
                linkedSources: linkedTotal,
                activities: activityRows.length + grantRows.length + startupRows.length,
                evidenceFiles:
                    manualDocuments.length +
                    activityRows.filter((row) => Boolean(row.documentId)).length +
                    grantRows.filter((row) => Boolean(row.documentId)).length +
                    startupRows.filter((row) => Boolean(row.documentId)).length,
                supportingLinks: (assignment.supportingLinks ?? []).length,
            });

            const availableDecisions =
                canReview && currentStage
                    ? currentStage.kind === "final"
                        ? ["Approve", "Reject"]
                        : ["Forward", "Recommend", "Reject"]
                    : [];

            return {
                _id: assignment._id.toString(),
                planId: assignment.planId.toString(),
                planTitle: plan.title,
                academicYearLabel,
                scopeType: plan.scopeType,
                focusArea: plan.focusArea,
                unitLabel:
                    plan.scopeType === "Department"
                        ? departmentRef?.name ?? assignment.scopeDepartmentName ?? "Department"
                        : institutionRef?.name ?? assignment.scopeCollegeName ?? "Institution",
                planStatus: plan.status,
                planSummary: plan.summary,
                planStrategyGoals: plan.strategyGoals,
                planTargets: {
                    publications: plan.targetPublicationCount ?? 0,
                    projects: plan.targetProjectCount ?? 0,
                    patents: plan.targetPatentCount ?? 0,
                    consultancies: plan.targetConsultancyCount ?? 0,
                    studentResearch: plan.targetStudentResearchCount ?? 0,
                    innovationActivities: plan.targetInnovationActivityCount ?? 0,
                },
                assigneeName: assignee?.name ?? "",
                assigneeEmail: assignee?.email ?? "",
                assigneeRole: assignee?.role ?? assignment.assigneeRole,
                status: assignment.status,
                dueDate: assignment.dueDate,
                notes: assignment.notes,
                researchStrategy: assignment.researchStrategy,
                fundingPipeline: assignment.fundingPipeline,
                publicationQualityPractices: assignment.publicationQualityPractices,
                innovationEcosystem: assignment.innovationEcosystem,
                incubationSupport: assignment.incubationSupport,
                consultancyTranslation: assignment.consultancyTranslation,
                iprCommercialization: assignment.iprCommercialization,
                studentResearchEngagement: assignment.studentResearchEngagement,
                collaborationHighlights: assignment.collaborationHighlights,
                ethicsAndCompliance: assignment.ethicsAndCompliance,
                supportingLinks: assignment.supportingLinks ?? [],
                documentIds:
                    assignment.documentIds?.map((value: Types.ObjectId) => value.toString()) ?? [],
                documents: manualDocuments,
                contributorRemarks: assignment.contributorRemarks,
                reviewRemarks: assignment.reviewRemarks,
                sourceCatalog,
                linkedSources,
                sourceMetrics: {
                    available: availableCounts,
                    linked: linkedCounts,
                    linkedTotal,
                },
                activities: activityRows,
                grants: grantRows,
                startups: startupRows,
                reviewHistory: (assignment.reviewHistory ?? []).map((row: Record<string, any>) => ({
                    reviewerName: row.reviewerName,
                    reviewerRole: row.reviewerRole,
                    stage: row.stage,
                    decision: row.decision,
                    remarks: row.remarks,
                    reviewedAt: row.reviewedAt,
                })),
                statusLogs: (assignment.statusLogs ?? []).map((row: Record<string, any>) => ({
                    status: row.status,
                    actorName: row.actorName,
                    actorRole: row.actorRole,
                    remarks: row.remarks,
                    changedAt: row.changedAt,
                })),
                valueSummary,
                submittedAt: assignment.submittedAt,
                reviewedAt: assignment.reviewedAt,
                approvedAt: assignment.approvedAt,
                updatedAt: assignment.updatedAt,
                scopeDepartmentName: assignment.scopeDepartmentName,
                scopeCollegeName: assignment.scopeCollegeName,
                scopeUniversityName: assignment.scopeUniversityName,
                currentStageLabel: currentStage?.label ?? "Completed",
                currentStageKind: currentStage?.kind ?? null,
                availableDecisions,
                permissions: {
                    canView,
                    canReview,
                    canApprove: canReview && currentStage?.kind === "final",
                    canReject: canReview,
                },
            } satisfies HydratedAssignmentRecord;
        })
    );
}

function validateContributionForSubmission(record: HydratedAssignmentRecord) {
    if (!record.researchStrategy?.trim()) {
        throw new AuthError("Research strategy is required before submission.", 400);
    }

    if (!record.innovationEcosystem?.trim()) {
        throw new AuthError("Innovation ecosystem narrative is required before submission.", 400);
    }

    if (!record.collaborationHighlights?.trim()) {
        throw new AuthError("Collaboration highlights are required before submission.", 400);
    }

    if (
        !record.sourceMetrics.linkedTotal &&
        !record.activities.length &&
        !record.grants.length &&
        !record.startups.length
    ) {
        throw new AuthError(
            "Link at least one source record or add one innovation, grant, or startup record before submission.",
            400
        );
    }

    const sourceEvidenceCount = sourceCategoryKeys.reduce(
        (sum, key) =>
            sum +
            record.linkedSources[key].filter((item) => Boolean(item.documentId || item.link)).length,
        0
    );
    const evidenceCount =
        record.documents.length +
        record.activities.filter((item) => Boolean(item.documentId)).length +
        record.grants.filter((item) => Boolean(item.documentId)).length +
        record.startups.filter((item) => Boolean(item.documentId)).length +
        sourceEvidenceCount +
        record.supportingLinks.length;

    if (!evidenceCount) {
        throw new AuthError(
            "Attach at least one evidence file or supporting link before submission.",
            400
        );
    }
}

export async function getResearchInnovationAdminConsole() {
    await dbConnect();

    const [plans, assignments, academicYears, departments, institutions, users] =
        await Promise.all([
            ResearchInnovationPlan.find({})
                .populate("academicYearId", "yearStart yearEnd")
                .populate("institutionId", "name")
                .populate("departmentId", "name")
                .sort({ updatedAt: -1 })
                .lean(),
            ResearchInnovationAssignment.find({})
                .populate("planId", "title")
                .populate("assigneeUserId", "name email")
                .sort({ updatedAt: -1 })
                .lean(),
            AcademicYear.find({})
                .sort({ yearStart: -1, yearEnd: -1 })
                .select("yearStart yearEnd isActive")
                .lean(),
            Department.find({})
                .select("name institutionId")
                .sort({ name: 1 })
                .lean(),
            Institution.find({}).select("name").sort({ name: 1 }).lean(),
            User.find({ role: "Faculty", isActive: true, accountStatus: "Active" })
                .select("name email role department collegeName universityName")
                .sort({ name: 1 })
                .lean(),
        ]);

    return {
        plans: plans.map((plan: Record<string, any>) => ({
            _id: plan._id.toString(),
            title: plan.title,
            academicYearLabel:
                plan.academicYearId && typeof plan.academicYearId === "object" && "yearStart" in plan.academicYearId
                    ? formatAcademicYearLabel(plan.academicYearId.yearStart, plan.academicYearId.yearEnd)
                    : "",
            scopeType: plan.scopeType,
            focusArea: plan.focusArea,
            institutionId:
                plan.institutionId && typeof plan.institutionId === "object" && "_id" in plan.institutionId
                    ? plan.institutionId._id.toString()
                    : plan.institutionId?.toString?.(),
            institutionName:
                plan.institutionId && typeof plan.institutionId === "object" && "name" in plan.institutionId
                    ? String(plan.institutionId.name)
                    : undefined,
            departmentId:
                plan.departmentId && typeof plan.departmentId === "object" && "_id" in plan.departmentId
                    ? plan.departmentId._id.toString()
                    : plan.departmentId?.toString?.(),
            departmentName:
                plan.departmentId && typeof plan.departmentId === "object" && "name" in plan.departmentId
                    ? String(plan.departmentId.name)
                    : undefined,
            summary: plan.summary,
            strategyGoals: plan.strategyGoals,
            targetPublicationCount: plan.targetPublicationCount ?? 0,
            targetProjectCount: plan.targetProjectCount ?? 0,
            targetPatentCount: plan.targetPatentCount ?? 0,
            targetConsultancyCount: plan.targetConsultancyCount ?? 0,
            targetStudentResearchCount: plan.targetStudentResearchCount ?? 0,
            targetInnovationActivityCount: plan.targetInnovationActivityCount ?? 0,
            facultyOwnerUserId: plan.facultyOwnerUserId?.toString?.(),
            status: plan.status,
            updatedAt: plan.updatedAt,
        })),
        assignments: assignments.map((assignment: Record<string, any>) => ({
            _id: assignment._id.toString(),
            planId:
                assignment.planId && typeof assignment.planId === "object" && "_id" in assignment.planId
                    ? assignment.planId._id.toString()
                    : assignment.planId?.toString?.(),
            planTitle:
                assignment.planId && typeof assignment.planId === "object" && "title" in assignment.planId
                    ? String(assignment.planId.title)
                    : "",
            assigneeUserId:
                assignment.assigneeUserId &&
                typeof assignment.assigneeUserId === "object" &&
                "_id" in assignment.assigneeUserId
                    ? assignment.assigneeUserId._id.toString()
                    : assignment.assigneeUserId?.toString?.(),
            assigneeName:
                assignment.assigneeUserId &&
                typeof assignment.assigneeUserId === "object" &&
                "name" in assignment.assigneeUserId
                    ? String(assignment.assigneeUserId.name)
                    : "",
            assigneeEmail:
                assignment.assigneeUserId &&
                typeof assignment.assigneeUserId === "object" &&
                "email" in assignment.assigneeUserId
                    ? String(assignment.assigneeUserId.email)
                    : "",
            dueDate: assignment.dueDate,
            notes: assignment.notes,
            status: assignment.status,
            isActive: Boolean(assignment.isActive),
            updatedAt: assignment.updatedAt,
        })),
        academicYearOptions: academicYears.map((item) => ({
            id: item._id.toString(),
            label: formatAcademicYearLabel(item.yearStart, item.yearEnd),
            isActive: Boolean(item.isActive),
        })),
        departmentOptions: departments.map((item) => ({
            id: item._id.toString(),
            label: item.name,
            institutionId: item.institutionId?.toString?.(),
        })),
        institutionOptions: institutions.map((item) => ({
            id: item._id.toString(),
            label: item.name,
        })),
        userOptions: users.map((item) => ({
            id: item._id.toString(),
            label: item.name,
            email: item.email,
            department: item.department,
            collegeName: item.collegeName,
            universityName: item.universityName,
        })),
    };
}

export async function getResearchInnovationContributorWorkspace(
    actor: ResearchInnovationActor
) {
    await dbConnect();

    const assignments = await ResearchInnovationAssignment.find({
        assigneeUserId: new Types.ObjectId(actor.id),
        isActive: true,
    })
        .sort({ updatedAt: -1, dueDate: 1 })
        .lean();

    return {
        assignments: await hydrateAssignments(assignments, actor),
    };
}

export async function getResearchInnovationReviewWorkspace(
    actor: ResearchInnovationActor
) {
    await dbConnect();

    const profile = await resolveAuthorizationProfile(actor);
    if (actor.role !== "Admin" && !canListModuleRecords(profile, "RESEARCH_INNOVATION")) {
        throw new AuthError(
            "You do not have access to research & innovation review records.",
            403
        );
    }

    const assignments = await ResearchInnovationAssignment.find(
        actor.role === "Admin" ? {} : buildAuthorizedScopeQuery(profile)
    )
        .sort({ updatedAt: -1 })
        .lean();

    const records = await hydrateAssignments(assignments, actor);
    return {
        summary: {
            total: records.length,
            actionableCount: records.filter(
                (item) => item.permissions.canReview || item.permissions.canApprove
            ).length,
            pendingCount: records.filter((item) =>
                ["Submitted", "Research Review", "Under Review", "Committee Review"].includes(
                    item.status
                )
            ).length,
            approvedCount: records.filter((item) => item.status === "Approved").length,
            rejectedCount: records.filter((item) => item.status === "Rejected").length,
        },
        records,
    };
}

export async function createResearchInnovationPlan(
    actor: ResearchInnovationActor,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = researchInnovationPlanSchema.parse(rawInput);
    const context = await resolvePlanContext(input);
    const facultyOwner = input.facultyOwnerUserId
        ? await ensureEligibleResearchContributor(input.facultyOwnerUserId, {
              planScope: context.scope,
              planAcademicYearId: input.academicYearId,
          })
        : null;

    const plan = new ResearchInnovationPlan({
        academicYearId: new Types.ObjectId(input.academicYearId),
        institutionId: context.institution?._id,
        departmentId: context.department?._id,
        facultyOwnerUserId: facultyOwner?._id,
        title: input.title,
        scopeType: input.scopeType,
        focusArea: input.focusArea,
        summary: input.summary,
        strategyGoals: input.strategyGoals,
        targetPublicationCount: input.targetPublicationCount,
        targetProjectCount: input.targetProjectCount,
        targetPatentCount: input.targetPatentCount,
        targetConsultancyCount: input.targetConsultancyCount,
        targetStudentResearchCount: input.targetStudentResearchCount,
        targetInnovationActivityCount: input.targetInnovationActivityCount,
        status: input.status,
        createdBy: new Types.ObjectId(actor.id),
    });
    copyScopeToPlan(plan, context.scope);
    await plan.save();

    await createAuditEntry(
        actor,
        "CREATE",
        "research_innovation_plans",
        plan._id.toString(),
        undefined,
        plan.toObject()
    );

    return plan;
}

export async function updateResearchInnovationPlan(
    actor: ResearchInnovationActor,
    planId: string,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = researchInnovationPlanUpdateSchema.parse(rawInput);
    const { plan } = await loadPlanCore(planId);
    const oldData = plan.toObject();

    const hasLiveAssignments = await ResearchInnovationAssignment.exists({
        planId: plan._id,
        status: { $nin: ["Draft", "Rejected"] },
    });

    const isStructuralChange =
        input.academicYearId !== undefined ||
        input.scopeType !== undefined ||
        input.institutionId !== undefined ||
        input.departmentId !== undefined;

    if (hasLiveAssignments && isStructuralChange) {
        throw new AuthError(
            "Core plan mapping cannot be changed after workflow activity has started.",
            409
        );
    }

    if (
        input.academicYearId !== undefined ||
        input.scopeType !== undefined ||
        input.institutionId !== undefined ||
        input.departmentId !== undefined
    ) {
        const context = await resolvePlanContext({
            academicYearId: input.academicYearId ?? plan.academicYearId.toString(),
            scopeType: input.scopeType ?? plan.scopeType,
            institutionId: input.institutionId ?? plan.institutionId?.toString(),
            departmentId: input.departmentId ?? plan.departmentId?.toString(),
        });

        plan.academicYearId = new Types.ObjectId(
            input.academicYearId ?? plan.academicYearId.toString()
        );
        plan.scopeType = input.scopeType ?? plan.scopeType;
        plan.institutionId = context.institution?._id;
        plan.departmentId = context.department?._id;
        copyScopeToPlan(plan, context.scope);
    }

    if (input.title !== undefined) plan.title = input.title;
    if (input.focusArea !== undefined) plan.focusArea = input.focusArea;
    if (input.summary !== undefined) plan.summary = input.summary || undefined;
    if (input.strategyGoals !== undefined) {
        plan.strategyGoals = input.strategyGoals || undefined;
    }
    if (input.targetPublicationCount !== undefined) {
        plan.targetPublicationCount = input.targetPublicationCount;
    }
    if (input.targetProjectCount !== undefined) {
        plan.targetProjectCount = input.targetProjectCount;
    }
    if (input.targetPatentCount !== undefined) {
        plan.targetPatentCount = input.targetPatentCount;
    }
    if (input.targetConsultancyCount !== undefined) {
        plan.targetConsultancyCount = input.targetConsultancyCount;
    }
    if (input.targetStudentResearchCount !== undefined) {
        plan.targetStudentResearchCount = input.targetStudentResearchCount;
    }
    if (input.targetInnovationActivityCount !== undefined) {
        plan.targetInnovationActivityCount = input.targetInnovationActivityCount;
    }
    if (input.status !== undefined) plan.status = input.status;

    if (input.facultyOwnerUserId !== undefined) {
        const owner = input.facultyOwnerUserId
            ? await ensureEligibleResearchContributor(input.facultyOwnerUserId, {
                  planScope: {
                      departmentName: plan.scopeDepartmentName,
                      collegeName: plan.scopeCollegeName,
                      universityName: plan.scopeUniversityName,
                      departmentId: plan.scopeDepartmentId?.toString(),
                      institutionId: plan.scopeInstitutionId?.toString(),
                      departmentOrganizationId: plan.scopeDepartmentOrganizationId?.toString(),
                      collegeOrganizationId: plan.scopeCollegeOrganizationId?.toString(),
                      universityOrganizationId: plan.scopeUniversityOrganizationId?.toString(),
                      subjectOrganizationIds: plan.scopeOrganizationIds.map((value) => value.toString()),
                  },
                  planAcademicYearId: plan.academicYearId.toString(),
                  planFacultyOwnerUserId: plan.facultyOwnerUserId?.toString(),
              })
            : null;
        plan.facultyOwnerUserId = owner?._id;
    }

    await plan.save();

    await createAuditEntry(
        actor,
        "UPDATE",
        "research_innovation_plans",
        plan._id.toString(),
        oldData,
        plan.toObject()
    );

    return plan;
}

export async function createResearchInnovationAssignment(
    actor: ResearchInnovationActor,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = researchInnovationAssignmentSchema.parse(rawInput);
    const { plan, scope } = await loadPlanCore(input.planId);

    if (plan.status === "Locked") {
        throw new AuthError("Locked research plans cannot receive new assignments.", 409);
    }

    const assignee = await ensureEligibleResearchContributor(input.assigneeUserId, {
        planScope: scope,
        planAcademicYearId: plan.academicYearId.toString(),
        planFacultyOwnerUserId: plan.facultyOwnerUserId?.toString(),
    });
    const existing = await ResearchInnovationAssignment.findOne({
        planId: plan._id,
        assigneeUserId: assignee._id,
    });

    if (existing) {
        throw new AuthError(
            "This faculty user already has a research & innovation assignment for the selected plan.",
            409
        );
    }

    const assignment = new ResearchInnovationAssignment({
        planId: plan._id,
        assigneeUserId: assignee._id,
        assignedBy: new Types.ObjectId(actor.id),
        assigneeRole: assignee.role,
        dueDate: toOptionalDate(input.dueDate),
        notes: input.notes || undefined,
        status: "Draft",
        isActive: input.isActive,
        statusLogs: [],
    });
    copyScopeToAssignment(assignment, scope);
    pushStatusLog(assignment, "Draft", actor, "Research & innovation assignment created.");
    await assignment.save();

    await createAuditEntry(
        actor,
        "CREATE",
        "research_innovation_assignments",
        assignment._id.toString(),
        undefined,
        assignment.toObject()
    );

    return assignment;
}

export async function updateResearchInnovationAssignment(
    actor: ResearchInnovationActor,
    assignmentId: string,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = researchInnovationAssignmentUpdateSchema.parse(rawInput);
    const { assignment, plan, scope } = await loadAssignmentCore(assignmentId);
    const oldData = assignment.toObject();

    const hasContributionData =
        assignment.researchStrategy?.trim() ||
        assignment.fundingPipeline?.trim() ||
        assignment.publicationQualityPractices?.trim() ||
        assignment.innovationEcosystem?.trim() ||
        assignment.incubationSupport?.trim() ||
        assignment.consultancyTranslation?.trim() ||
        assignment.iprCommercialization?.trim() ||
        assignment.studentResearchEngagement?.trim() ||
        assignment.collaborationHighlights?.trim() ||
        assignment.ethicsAndCompliance?.trim() ||
        assignment.supportingLinks.length ||
        assignment.documentIds.length ||
        assignment.activityIds.length ||
        assignment.grantIds.length ||
        assignment.startupIds.length ||
        assignment.facultyPublicationIds.length ||
        assignment.facultyPatentIds.length ||
        assignment.facultyResearchProjectIds.length ||
        assignment.facultyConsultancyIds.length ||
        assignment.researchPublicationIds.length ||
        assignment.researchProjectIds.length ||
        assignment.intellectualPropertyIds.length ||
        assignment.researchActivityIds.length ||
        assignment.studentPublicationIds.length ||
        assignment.studentResearchProjectIds.length ||
        assignment.contributorRemarks?.trim();

    if (
        input.assigneeUserId &&
        hasContributionData &&
        input.assigneeUserId !== assignment.assigneeUserId.toString()
    ) {
        throw new AuthError(
            "Assignee remapping is blocked once research contribution data exists.",
            409
        );
    }

    if (input.assigneeUserId) {
        const assignee = await ensureEligibleResearchContributor(input.assigneeUserId, {
            planScope: scope,
            planAcademicYearId: plan.academicYearId.toString(),
            planFacultyOwnerUserId: plan.facultyOwnerUserId?.toString(),
        });
        assignment.assigneeUserId = assignee._id;
        assignment.assigneeRole = assignee.role;
    }

    if (input.dueDate !== undefined) assignment.dueDate = toOptionalDate(input.dueDate);
    if (input.notes !== undefined) assignment.notes = input.notes || undefined;
    if (input.isActive !== undefined) assignment.isActive = input.isActive;

    await assignment.save();

    await createAuditEntry(
        actor,
        "UPDATE",
        "research_innovation_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function saveResearchInnovationContributionDraft(
    actor: ResearchInnovationActor,
    assignmentId: string,
    rawInput: unknown
) {
    await dbConnect();

    const input = researchInnovationContributionDraftSchema.parse(rawInput);
    const { assignment, plan } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() !== actor.id) {
        throw new AuthError("This research & innovation assignment is not mapped to your account.", 403);
    }

    if (!assignment.isActive) {
        throw new AuthError("This research & innovation assignment is inactive.", 409);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or returned assignments can be edited.", 409);
    }

    if (plan.status === "Locked") {
        throw new AuthError("Locked research plans cannot be edited.", 409);
    }

    const sourceCatalog = await buildSourceCatalogForPlan({
        academicYearId: plan.academicYearId,
        scopeType: plan.scopeType,
        institutionId: plan.institutionId,
        departmentId: plan.departmentId,
    });
    validateSelectedSources(input, sourceCatalog);

    const oldData = assignment.toObject();
    const [activityIds, grantIds, startupIds] = await Promise.all([
        syncActivities(assignment, input),
        syncGrants(assignment, input),
        syncStartups(assignment, input),
    ]);

    assignment.researchStrategy = input.researchStrategy || undefined;
    assignment.fundingPipeline = input.fundingPipeline || undefined;
    assignment.publicationQualityPractices = input.publicationQualityPractices || undefined;
    assignment.innovationEcosystem = input.innovationEcosystem || undefined;
    assignment.incubationSupport = input.incubationSupport || undefined;
    assignment.consultancyTranslation = input.consultancyTranslation || undefined;
    assignment.iprCommercialization = input.iprCommercialization || undefined;
    assignment.studentResearchEngagement = input.studentResearchEngagement || undefined;
    assignment.collaborationHighlights = input.collaborationHighlights || undefined;
    assignment.ethicsAndCompliance = input.ethicsAndCompliance || undefined;
    assignment.facultyPublicationIds = toObjectIdList(input.facultyPublicationIds);
    assignment.facultyPatentIds = toObjectIdList(input.facultyPatentIds);
    assignment.facultyResearchProjectIds = toObjectIdList(input.facultyResearchProjectIds);
    assignment.facultyConsultancyIds = toObjectIdList(input.facultyConsultancyIds);
    assignment.researchPublicationIds = toObjectIdList(input.researchPublicationIds);
    assignment.researchProjectIds = toObjectIdList(input.researchProjectIds);
    assignment.intellectualPropertyIds = toObjectIdList(input.intellectualPropertyIds);
    assignment.researchActivityIds = toObjectIdList(input.researchActivityIds);
    assignment.studentPublicationIds = toObjectIdList(input.studentPublicationIds);
    assignment.studentResearchProjectIds = toObjectIdList(input.studentResearchProjectIds);
    assignment.activityIds = toObjectIdList(activityIds);
    assignment.grantIds = toObjectIdList(grantIds);
    assignment.startupIds = toObjectIdList(startupIds);
    assignment.supportingLinks = input.supportingLinks;
    assignment.documentIds = toObjectIdList(input.documentIds);
    assignment.contributorRemarks = input.contributorRemarks || undefined;
    await assignment.save();

    await createAuditEntry(
        actor,
        "DRAFT_SAVE",
        "research_innovation_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function submitResearchInnovationAssignment(
    actor: ResearchInnovationActor,
    assignmentId: string
) {
    await dbConnect();

    const { assignment, plan } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() !== actor.id) {
        throw new AuthError("This research & innovation assignment is not mapped to your account.", 403);
    }

    if (!assignment.isActive) {
        throw new AuthError("This research & innovation assignment is inactive.", 409);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or returned assignments can be submitted.", 409);
    }

    if (plan.status !== "Active") {
        throw new AuthError("The research & innovation plan must be active before submission.", 400);
    }

    const hydrated = (await hydrateAssignments([assignment.toObject()], actor))[0];
    validateContributionForSubmission(hydrated);

    const transition = resolveWorkflowTransition(
        await getActiveWorkflowDefinition("RESEARCH_INNOVATION"),
        assignment.status,
        "submit"
    );
    assignment.status = transition.status as ResearchInnovationWorkflowStatus;
    assignment.submittedAt = new Date();
    assignment.reviewedAt = undefined;
    assignment.approvedAt = undefined;
    assignment.approvedBy = undefined;
    assignment.reviewRemarks = undefined;
    pushStatusLog(
        assignment,
        assignment.status,
        actor,
        "Research & innovation contribution submitted."
    );
    await assignment.save();

    await syncWorkflowInstanceState({
        moduleName: "RESEARCH_INNOVATION",
        recordId: assignment._id.toString(),
        status: assignment.status,
        subjectDepartmentName: assignment.scopeDepartmentName,
        subjectCollegeName: assignment.scopeCollegeName,
        subjectUniversityName: assignment.scopeUniversityName,
        subjectDepartmentId: assignment.scopeDepartmentId?.toString(),
        subjectInstitutionId: assignment.scopeInstitutionId?.toString(),
        subjectDepartmentOrganizationId: assignment.scopeDepartmentOrganizationId?.toString(),
        subjectCollegeOrganizationId: assignment.scopeCollegeOrganizationId?.toString(),
        subjectUniversityOrganizationId: assignment.scopeUniversityOrganizationId?.toString(),
        subjectOrganizationIds: assignment.scopeOrganizationIds.map((value) => value.toString()),
        actor,
        remarks: "Research & innovation contribution submitted.",
        action: "submit",
    });

    await createAuditEntry(
        actor,
        "SUBMIT",
        "research_innovation_assignments",
        assignment._id.toString(),
        undefined,
        assignment.toObject()
    );

    return assignment;
}

export async function reviewResearchInnovationAssignment(
    actor: ResearchInnovationActor,
    assignmentId: string,
    rawInput: unknown
) {
    await dbConnect();

    const input = researchInnovationReviewSchema.parse(rawInput);
    const { assignment } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() === actor.id && actor.role !== "Admin") {
        throw new AuthError("Contributors cannot review their own research & innovation assignment.", 403);
    }

    const workflowDefinition = await getActiveWorkflowDefinition("RESEARCH_INNOVATION");
    const currentStage = getWorkflowStageByStatus(workflowDefinition, assignment.status);

    if (!currentStage) {
        throw new AuthError("This research & innovation assignment is not pending review.", 409);
    }

    const canReview = await canActorProcessWorkflowStage({
        actor,
        moduleName: "RESEARCH_INNOVATION",
        recordId: assignment._id.toString(),
        status: assignment.status,
        subjectDepartmentName: assignment.scopeDepartmentName,
        subjectCollegeName: assignment.scopeCollegeName,
        subjectUniversityName: assignment.scopeUniversityName,
        subjectDepartmentId: assignment.scopeDepartmentId?.toString(),
        subjectInstitutionId: assignment.scopeInstitutionId?.toString(),
        subjectDepartmentOrganizationId: assignment.scopeDepartmentOrganizationId?.toString(),
        subjectCollegeOrganizationId: assignment.scopeCollegeOrganizationId?.toString(),
        subjectUniversityOrganizationId: assignment.scopeUniversityOrganizationId?.toString(),
        subjectOrganizationIds: assignment.scopeOrganizationIds.map((value) => value.toString()),
        stageKinds: [currentStage.kind],
    });

    if (!canReview) {
        throw new AuthError("You are not authorized to review this assignment.", 403);
    }

    if (currentStage.kind === "review" && !["Forward", "Recommend", "Reject"].includes(input.decision)) {
        throw new AuthError("Use Forward, Recommend, or Reject during review stages.", 400);
    }

    if (currentStage.kind === "final" && !["Approve", "Reject"].includes(input.decision)) {
        throw new AuthError("Use Approve or Reject during final approval.", 400);
    }

    const oldData = assignment.toObject();
    const action = input.decision === "Reject" ? "reject" : "approve";
    const transition = resolveWorkflowTransition(
        workflowDefinition,
        assignment.status,
        action
    );

    assignment.status = transition.status as ResearchInnovationWorkflowStatus;
    assignment.reviewRemarks = input.remarks;
    assignment.reviewedAt = new Date();
    assignment.reviewHistory.push({
        reviewerId: new Types.ObjectId(actor.id),
        reviewerName: actor.name,
        reviewerRole: actor.role,
        stage: currentStage.label,
        decision: input.decision,
        remarks: input.remarks,
        reviewedAt: assignment.reviewedAt,
    });
    pushStatusLog(assignment, assignment.status, actor, input.remarks);

    if (transition.completed && transition.status === workflowDefinition.approvedStatus) {
        assignment.approvedAt = new Date();
        assignment.approvedBy = new Types.ObjectId(actor.id);
    } else if (transition.status === workflowDefinition.rejectedStatus) {
        assignment.approvedAt = undefined;
        assignment.approvedBy = undefined;
    }

    await assignment.save();

    await syncWorkflowInstanceState({
        moduleName: "RESEARCH_INNOVATION",
        recordId: assignment._id.toString(),
        status: assignment.status,
        subjectDepartmentName: assignment.scopeDepartmentName,
        subjectCollegeName: assignment.scopeCollegeName,
        subjectUniversityName: assignment.scopeUniversityName,
        subjectDepartmentId: assignment.scopeDepartmentId?.toString(),
        subjectInstitutionId: assignment.scopeInstitutionId?.toString(),
        subjectDepartmentOrganizationId: assignment.scopeDepartmentOrganizationId?.toString(),
        subjectCollegeOrganizationId: assignment.scopeCollegeOrganizationId?.toString(),
        subjectUniversityOrganizationId: assignment.scopeUniversityOrganizationId?.toString(),
        subjectOrganizationIds: assignment.scopeOrganizationIds.map((value) => value.toString()),
        actor,
        remarks: input.remarks,
        action,
    });

    await createAuditEntry(
        actor,
        "REVIEW",
        "research_innovation_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}
