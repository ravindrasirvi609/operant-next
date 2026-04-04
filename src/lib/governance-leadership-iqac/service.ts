import { Types } from "mongoose";

import { formatAcademicYearLabel } from "@/lib/academic-year";
import { createAuditLog, type AuditRequestContext } from "@/lib/audit/service";
import { AuthError } from "@/lib/auth/errors";
import {
    buildAuthorizedScopeQuery,
    canListModuleRecords,
    canViewModuleRecord,
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
import GovernanceCommitteeMembership from "@/models/core/governance-committee-membership";
import LeadershipAssignment from "@/models/core/leadership-assignment";
import User from "@/models/core/user";
import Faculty from "@/models/faculty/faculty";
import GovernanceLeadershipIqacAssignment, {
    type IGovernanceLeadershipIqacAssignment,
    type GovernanceLeadershipIqacWorkflowStatus,
} from "@/models/core/governance-leadership-iqac-assignment";
import GovernanceIqacMeeting from "@/models/core/governance-iqac-meeting";
import GovernanceComplianceReview from "@/models/core/governance-compliance-review";
import GovernanceLeadershipIqacPlan from "@/models/core/governance-leadership-iqac-plan";
import GovernanceQualityInitiative from "@/models/core/governance-quality-initiative";
import GovernancePolicyCircular from "@/models/core/governance-policy-circular";
import AcademicYear from "@/models/reference/academic-year";
import Department from "@/models/reference/department";
import DocumentModel from "@/models/reference/document";
import Institution from "@/models/reference/institution";
import {
    governanceLeadershipIqacAssignmentSchema,
    governanceLeadershipIqacAssignmentUpdateSchema,
    governanceLeadershipIqacContributionDraftSchema,
    governanceLeadershipIqacPlanSchema,
    governanceLeadershipIqacPlanUpdateSchema,
    governanceLeadershipIqacReviewSchema,
    type GovernanceLeadershipIqacContributionDraftInput,
} from "@/lib/governance-leadership-iqac/validators";

type GovernanceLeadershipIqacActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
    collegeName?: string;
    universityName?: string;
    auditContext?: AuditRequestContext;
};

type GovernanceLeadershipIqacScope = {
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

type HydratedDocument = {
    id: string;
    fileName?: string;
    fileUrl?: string;
    fileType?: string;
    uploadedAt?: Date;
    verificationStatus?: string;
    verificationRemarks?: string;
};

type HydratedIqacMeeting = {
    id: string;
    meetingType: string;
    title: string;
    meetingDate?: Date;
    chairedBy?: string;
    attendeeCount?: number;
    agendaSummary?: string;
    decisionSummary?: string;
    actionTakenSummary?: string;
    remarks?: string;
    documentId?: string;
    document?: HydratedDocument;
};

type HydratedQualityInitiative = {
    id: string;
    initiativeType: string;
    title: string;
    startDate?: Date;
    endDate?: Date;
    status: string;
    ownerName?: string;
    impactSummary?: string;
    remarks?: string;
    documentId?: string;
    document?: HydratedDocument;
};

type HydratedPolicyCircular = {
    id: string;
    policyType: string;
    title: string;
    issueDate?: Date;
    issuingAuthority?: string;
    applicabilityScope?: string;
    revisionStatus: string;
    summary?: string;
    documentId?: string;
    document?: HydratedDocument;
};

type HydratedComplianceReview = {
    id: string;
    reviewType: string;
    title: string;
    reviewDate?: Date;
    status: string;
    riskLevel: string;
    observationsSummary?: string;
    actionTakenSummary?: string;
    remarks?: string;
    documentId?: string;
    document?: HydratedDocument;
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
    planStrategicPriorities?: string;
    planTargets: {
        meetings: number;
        initiatives: number;
        policies: number;
        complianceReviews: number;
    };
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: GovernanceLeadershipIqacWorkflowStatus;
    dueDate?: Date;
    notes?: string;
    governanceStructureNarrative?: string;
    leadershipParticipationNarrative?: string;
    iqacFrameworkNarrative?: string;
    qualityInitiativesNarrative?: string;
    policyGovernanceNarrative?: string;
    complianceMonitoringNarrative?: string;
    stakeholderParticipationNarrative?: string;
    institutionalBestPracticesNarrative?: string;
    feedbackLoopNarrative?: string;
    actionPlan?: string;
    supportingLinks: string[];
    documentIds: string[];
    documents: HydratedDocument[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    iqacMeetings: HydratedIqacMeeting[];
    qualityInitiatives: HydratedQualityInitiative[];
    policyCirculars: HydratedPolicyCircular[];
    complianceReviews: HydratedComplianceReview[];
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

const governanceLeadershipCoordinatorPattern =
    /(iqac|quality|governance|leadership|naac|nirf|academic audit|compliance|policy|strategic planning|principal|director|hod|office head)/i;

function ensureAdminActor(actor: GovernanceLeadershipIqacActor) {
    if (actor.role !== "Admin") {
        throw new AuthError("Admin access is required.", 403);
    }
}

function ensureObjectId(id: string, message: string) {
    if (!Types.ObjectId.isValid(id)) {
        throw new AuthError(message, 400);
    }

    return new Types.ObjectId(id);
}

function toObjectIdList(values?: string[]) {
    return (values ?? [])
        .filter((value) => Types.ObjectId.isValid(value))
        .map((value) => new Types.ObjectId(value));
}

function toOptionalDate(value?: string | null) {
    if (!value?.trim()) {
        return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new AuthError(`Invalid date value "${value}".`, 400);
    }

    return parsed;
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

function fullName(row: { firstName?: string; lastName?: string }) {
    const value = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
    return value || undefined;
}

function mapDocumentRecord(row: Record<string, any>): HydratedDocument {
    return {
        id: row._id.toString(),
        fileName: row.fileName,
        fileUrl: row.fileUrl,
        fileType: row.fileType,
        uploadedAt: row.uploadedAt,
        verificationStatus: row.verificationStatus,
        verificationRemarks: row.verificationRemarks,
    };
}

function buildPlanSubjectScope(scope: GovernanceLeadershipIqacScope) {
    return {
        departmentName: scope.departmentName,
        collegeName: scope.collegeName,
        universityName: scope.universityName,
        departmentId: scope.departmentId,
        institutionId: scope.institutionId,
        departmentOrganizationId: scope.departmentOrganizationId,
        collegeOrganizationId: scope.collegeOrganizationId,
        universityOrganizationId: scope.universityOrganizationId,
        subjectOrganizationIds: scope.subjectOrganizationIds ?? [],
    };
}

function createStatusLog(
    assignment: Pick<IGovernanceLeadershipIqacAssignment, "statusLogs">,
    actor: GovernanceLeadershipIqacActor,
    status: GovernanceLeadershipIqacWorkflowStatus,
    remarks?: string
) {
    assignment.statusLogs.push({
        status,
        actorId: new Types.ObjectId(actor.id),
        actorName: actor.name,
        actorRole: actor.role,
        remarks,
        changedAt: new Date(),
    });
}

function createValueSummary(record: {
    narratives: Record<string, string | undefined>;
    iqacMeetings: number;
    qualityInitiatives: number;
    policyCirculars: number;
    complianceReviews: number;
    evidenceFiles: number;
    supportingLinks: number;
}) {
    const narrativeCount = Object.values(record.narratives).filter((value) => value?.trim()).length;

    return [
        `${narrativeCount} narrative section(s)`,
        `${record.iqacMeetings} IQAC meeting row(s)`,
        `${record.qualityInitiatives} quality initiative row(s)`,
        `${record.policyCirculars} policy or circular row(s)`,
        `${record.complianceReviews} compliance review row(s)`,
        `${record.evidenceFiles + record.supportingLinks} evidence link(s/files)`,
    ].join(" · ");
}

async function createAuditEntry(
    actor: GovernanceLeadershipIqacActor,
    action: string,
    tableName: string,
    recordId: string,
    oldData?: unknown,
    newData?: unknown
) {
    await createAuditLog({
        actor,
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

        const institution = await Institution.findById(department.institutionId).select(
            "_id name organizationId"
        );

        if (!institution) {
            throw new AuthError("Department institution was not found.", 404);
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
            } satisfies GovernanceLeadershipIqacScope,
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
        } satisfies GovernanceLeadershipIqacScope,
    };
}

async function loadPlanCore(planId: string) {
    if (!Types.ObjectId.isValid(planId)) {
        throw new AuthError("Governance Leadership / IQAC plan is invalid.", 400);
    }

    const plan = await GovernanceLeadershipIqacPlan.findById(planId);
    if (!plan) {
        throw new AuthError("Governance Leadership / IQAC plan was not found.", 404);
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
        throw new AuthError("Governance Leadership / IQAC assignment is invalid.", 400);
    }

    const assignment = await GovernanceLeadershipIqacAssignment.findById(assignmentId);
    if (!assignment) {
        throw new AuthError("Governance Leadership / IQAC assignment was not found.", 404);
    }

    const { plan, ...context } = await loadPlanCore(assignment.planId.toString());
    return { assignment, plan, ...context };
}

async function ensureEligibleGovernanceLeadershipIqacContributor(
    userId: string,
    options: {
        planScope: GovernanceLeadershipIqacScope;
        planOwnerUserId?: string;
    }
) {
    const user = await User.findById(userId).select(
        "name email role facultyId departmentId institutionId accountStatus isActive department collegeName universityName"
    );

    if (!user) {
        throw new AuthError("The selected user was not found.", 404);
    }

    if (user.role === "Student" || !user.isActive || user.accountStatus !== "Active") {
        throw new AuthError(
            "Only active leadership or governance users can be assigned governance leadership / IQAC work.",
            400
        );
    }

    const facultyScope =
        user.role === "Faculty" && user.facultyId
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

    if (options.planOwnerUserId && options.planOwnerUserId === user._id.toString()) {
        return user;
    }

    const subjectScope = buildPlanSubjectScope(options.planScope);

    const [authorizationProfile, committeeMemberships, leadershipAssignments] = await Promise.all([
        resolveAuthorizationProfile({
            id: user._id.toString(),
            name: user.name,
            role: user.role,
            department: user.department,
            collegeName: user.collegeName,
            universityName: user.universityName,
        }),
        GovernanceCommitteeMembership.find({
            userId: user._id,
            isActive: true,
            $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: new Date() } }],
        })
            .populate("committeeId", "committeeType")
            .select("committeeId")
            .lean(),
        LeadershipAssignment.find({
            userId: user._id,
            isActive: true,
            $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: new Date() } }],
        })
            .select("assignmentType organizationId")
            .lean(),
    ]);

    const hasCoordinatorRole = leadershipAssignments.some((assignment) =>
        governanceLeadershipCoordinatorPattern.test(String(assignment.assignmentType ?? ""))
    );
    const hasScopedWorkflowRole =
        canViewModuleRecord(
            authorizationProfile,
            "GOVERNANCE_LEADERSHIP_IQAC",
            subjectScope
        ) &&
        authorizationProfile.workflowRoles.some((role) =>
            [
                "OFFICE_HEAD",
                "DEPARTMENT_HEAD",
                "DIRECTOR",
                "PRINCIPAL",
                "IQAC",
            ].includes(role)
        );
    const hasCommitteeMembership =
        canViewModuleRecord(
            authorizationProfile,
            "GOVERNANCE_LEADERSHIP_IQAC",
            subjectScope
        ) &&
        committeeMemberships.some((membership) => {
            const committee = membership.committeeId as { committeeType?: string } | null;
            return committee?.committeeType === "IQAC" || committee?.committeeType === "NAAC_CELL";
        });

    if (
        !authorizationProfile.hasLeadershipPortalAccess ||
        !canViewModuleRecord(authorizationProfile, "GOVERNANCE_LEADERSHIP_IQAC", subjectScope) ||
        (!hasCoordinatorRole && !hasScopedWorkflowRole && !hasCommitteeMembership)
    ) {
        throw new AuthError(
            "Only the plan owner or an active scoped IQAC or leadership actor can be assigned to this portfolio.",
            400
        );
    }

    return user;
}

async function syncIqacMeetings(
    assignment: IGovernanceLeadershipIqacAssignment,
    input: GovernanceLeadershipIqacContributionDraftInput
) {
    const existingRows = await GovernanceIqacMeeting.find({
        assignmentId: assignment._id,
    });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.iqacMeetings.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            meetingType: row.meetingType,
            title: row.title,
            meetingDate: toOptionalDate(row.meetingDate),
            chairedBy: row.chairedBy || undefined,
            attendeeCount: row.attendeeCount,
            agendaSummary: row.agendaSummary || undefined,
            decisionSummary: row.decisionSummary || undefined,
            actionTakenSummary: row.actionTakenSummary || undefined,
            remarks: row.remarks || undefined,
            documentId: row.documentId
                ? ensureObjectId(row.documentId, "IQAC meeting document is invalid.")
                : undefined,
            displayOrder: row.displayOrder ?? index + 1,
        };

        if (row._id && existingById.has(row._id)) {
            const existing = existingById.get(row._id)!;
            existing.set(payload);
            await existing.save();
            keepIds.add(existing._id.toString());
            continue;
        }

        const created = await GovernanceIqacMeeting.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await GovernanceIqacMeeting.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function syncQualityInitiatives(
    assignment: IGovernanceLeadershipIqacAssignment,
    input: GovernanceLeadershipIqacContributionDraftInput
) {
    const existingRows = await GovernanceQualityInitiative.find({
        assignmentId: assignment._id,
    });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.qualityInitiatives.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            initiativeType: row.initiativeType,
            title: row.title,
            startDate: toOptionalDate(row.startDate),
            endDate: toOptionalDate(row.endDate),
            status: row.status,
            ownerName: row.ownerName || undefined,
            impactSummary: row.impactSummary || undefined,
            remarks: row.remarks || undefined,
            documentId: row.documentId
                ? ensureObjectId(row.documentId, "Quality initiative document is invalid.")
                : undefined,
            displayOrder: row.displayOrder ?? index + 1,
        };

        if (row._id && existingById.has(row._id)) {
            const existing = existingById.get(row._id)!;
            existing.set(payload);
            await existing.save();
            keepIds.add(existing._id.toString());
            continue;
        }

        const created = await GovernanceQualityInitiative.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await GovernanceQualityInitiative.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function syncPolicyCirculars(
    assignment: IGovernanceLeadershipIqacAssignment,
    input: GovernanceLeadershipIqacContributionDraftInput
) {
    const existingRows = await GovernancePolicyCircular.find({
        assignmentId: assignment._id,
    });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.policyCirculars.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            policyType: row.policyType,
            title: row.title,
            issueDate: toOptionalDate(row.issueDate),
            issuingAuthority: row.issuingAuthority || undefined,
            applicabilityScope: row.applicabilityScope || undefined,
            revisionStatus: row.revisionStatus,
            summary: row.summary || undefined,
            documentId: row.documentId
                ? ensureObjectId(row.documentId, "Policy or circular document is invalid.")
                : undefined,
            displayOrder: row.displayOrder ?? index + 1,
        };

        if (row._id && existingById.has(row._id)) {
            const existing = existingById.get(row._id)!;
            existing.set(payload);
            await existing.save();
            keepIds.add(existing._id.toString());
            continue;
        }

        const created = await GovernancePolicyCircular.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await GovernancePolicyCircular.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function syncComplianceReviews(
    assignment: IGovernanceLeadershipIqacAssignment,
    input: GovernanceLeadershipIqacContributionDraftInput
) {
    const existingRows = await GovernanceComplianceReview.find({
        assignmentId: assignment._id,
    });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.complianceReviews.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            reviewType: row.reviewType,
            title: row.title,
            reviewDate: toOptionalDate(row.reviewDate),
            status: row.status,
            riskLevel: row.riskLevel,
            observationsSummary: row.observationsSummary || undefined,
            actionTakenSummary: row.actionTakenSummary || undefined,
            remarks: row.remarks || undefined,
            documentId: row.documentId
                ? ensureObjectId(row.documentId, "Compliance review document is invalid.")
                : undefined,
            displayOrder: row.displayOrder ?? index + 1,
        };

        if (row._id && existingById.has(row._id)) {
            const existing = existingById.get(row._id)!;
            existing.set(payload);
            await existing.save();
            keepIds.add(existing._id.toString());
            continue;
        }

        const created = await GovernanceComplianceReview.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await GovernanceComplianceReview.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function hydrateAssignments(
    assignments: Array<Record<string, any>>,
    actor?: GovernanceLeadershipIqacActor
) {
    const planIds = uniqueStrings(assignments.map((row) => row.planId?.toString()));
    const assigneeIds = uniqueStrings(assignments.map((row) => row.assigneeUserId?.toString()));
    const assignmentIds = uniqueStrings(assignments.map((row) => row._id?.toString()));

    const [plans, assignees, iqacMeetings, qualityInitiatives, policyCirculars, complianceReviews] =
        await Promise.all([
        planIds.length
            ? GovernanceLeadershipIqacPlan.find({ _id: { $in: toObjectIdList(planIds) } })
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
            ? GovernanceIqacMeeting.find({
                  assignmentId: { $in: toObjectIdList(assignmentIds) },
              })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? GovernanceQualityInitiative.find({
                  assignmentId: { $in: toObjectIdList(assignmentIds) },
              })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? GovernancePolicyCircular.find({
                  assignmentId: { $in: toObjectIdList(assignmentIds) },
              })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? GovernanceComplianceReview.find({
                  assignmentId: { $in: toObjectIdList(assignmentIds) },
              })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
    ]);

    const planById = new Map(plans.map((row) => [row._id.toString(), row]));
    const assigneeById = new Map(assignees.map((row) => [row._id.toString(), row]));

    const iqacMeetingByAssignmentId = new Map<string, Array<Record<string, any>>>();
    const qualityInitiativeByAssignmentId = new Map<string, Array<Record<string, any>>>();
    const policyCircularByAssignmentId = new Map<string, Array<Record<string, any>>>();
    const complianceReviewByAssignmentId = new Map<string, Array<Record<string, any>>>();

    for (const row of iqacMeetings) {
        const key = row.assignmentId.toString();
        iqacMeetingByAssignmentId.set(key, [...(iqacMeetingByAssignmentId.get(key) ?? []), row]);
    }
    for (const row of qualityInitiatives) {
        const key = row.assignmentId.toString();
        qualityInitiativeByAssignmentId.set(key, [...(qualityInitiativeByAssignmentId.get(key) ?? []), row]);
    }
    for (const row of policyCirculars) {
        const key = row.assignmentId.toString();
        policyCircularByAssignmentId.set(key, [...(policyCircularByAssignmentId.get(key) ?? []), row]);
    }
    for (const row of complianceReviews) {
        const key = row.assignmentId.toString();
        complianceReviewByAssignmentId.set(key, [
            ...(complianceReviewByAssignmentId.get(key) ?? []),
            row,
        ]);
    }

    const rowDocumentIds = uniqueStrings([
        ...iqacMeetings.map((row) => row.documentId?.toString()),
        ...qualityInitiatives.map((row) => row.documentId?.toString()),
        ...policyCirculars.map((row) => row.documentId?.toString()),
        ...complianceReviews.map((row) => row.documentId?.toString()),
        ...assignments.flatMap((row) =>
            (row.documentIds ?? []).map((value: Types.ObjectId) => value.toString())
        ),
    ]);
    const documents = rowDocumentIds.length
        ? await DocumentModel.find({ _id: { $in: toObjectIdList(rowDocumentIds) } }).lean()
        : [];
    const documentById = new Map(
        documents.map((row) => [row._id.toString(), mapDocumentRecord(row)])
    );

    const workflowDefinition = await getActiveWorkflowDefinition("GOVERNANCE_LEADERSHIP_IQAC");
    const profile = actor ? await resolveAuthorizationProfile(actor) : null;

    return Promise.all(
        assignments.map(async (assignment) => {
            const plan = planById.get(assignment.planId.toString());
            if (!plan) {
                throw new AuthError(
                    "Governance Leadership / IQAC assignment references a missing plan.",
                    400
                );
            }

            const assignee = assigneeById.get(assignment.assigneeUserId.toString());
            const iqacMeetingRows =
                (iqacMeetingByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                    id: row._id.toString(),
                    meetingType: row.meetingType,
                    title: row.title,
                    meetingDate: row.meetingDate,
                    chairedBy: row.chairedBy,
                    attendeeCount: row.attendeeCount,
                    agendaSummary: row.agendaSummary,
                    decisionSummary: row.decisionSummary,
                    actionTakenSummary: row.actionTakenSummary,
                    remarks: row.remarks,
                    documentId: row.documentId?.toString(),
                    document: row.documentId
                        ? documentById.get(row.documentId.toString())
                        : undefined,
                }));
            const qualityInitiativeRows =
                (qualityInitiativeByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                    id: row._id.toString(),
                    initiativeType: row.initiativeType,
                    title: row.title,
                    startDate: row.startDate,
                    endDate: row.endDate,
                    status: row.status,
                    ownerName: row.ownerName,
                    impactSummary: row.impactSummary,
                    remarks: row.remarks,
                    documentId: row.documentId?.toString(),
                    document: row.documentId
                        ? documentById.get(row.documentId.toString())
                        : undefined,
                }));
            const policyCircularItems =
                (policyCircularByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                    id: row._id.toString(),
                    policyType: row.policyType,
                    title: row.title,
                    issueDate: row.issueDate,
                    issuingAuthority: row.issuingAuthority,
                    applicabilityScope: row.applicabilityScope,
                    revisionStatus: row.revisionStatus,
                    summary: row.summary,
                    documentId: row.documentId?.toString(),
                    document: row.documentId
                        ? documentById.get(row.documentId.toString())
                        : undefined,
                }));
            const complianceReviewItems =
                (complianceReviewByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                    id: row._id.toString(),
                    reviewType: row.reviewType,
                    title: row.title,
                    reviewDate: row.reviewDate,
                    status: row.status,
                    riskLevel: row.riskLevel,
                    observationsSummary: row.observationsSummary,
                    actionTakenSummary: row.actionTakenSummary,
                    remarks: row.remarks,
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
            const currentStage = getWorkflowStageByStatus(workflowDefinition, assignment.status);
            const canView =
                actor?.role === "Admin"
                    ? true
                    : profile
                      ? canViewModuleRecord(profile, "GOVERNANCE_LEADERSHIP_IQAC", {
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
                          moduleName: "GOVERNANCE_LEADERSHIP_IQAC",
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
                .filter(Boolean) as HydratedDocument[];

            const valueSummary = createValueSummary({
                narratives: {
                    governanceStructureNarrative: assignment.governanceStructureNarrative,
                    leadershipParticipationNarrative: assignment.leadershipParticipationNarrative,
                    iqacFrameworkNarrative: assignment.iqacFrameworkNarrative,
                    qualityInitiativesNarrative: assignment.qualityInitiativesNarrative,
                    policyGovernanceNarrative: assignment.policyGovernanceNarrative,
                    complianceMonitoringNarrative: assignment.complianceMonitoringNarrative,
                    stakeholderParticipationNarrative: assignment.stakeholderParticipationNarrative,
                    institutionalBestPracticesNarrative: assignment.institutionalBestPracticesNarrative,
                    feedbackLoopNarrative: assignment.feedbackLoopNarrative,
                    actionPlan: assignment.actionPlan,
                },
                iqacMeetings: iqacMeetingRows.length,
                qualityInitiatives: qualityInitiativeRows.length,
                policyCirculars: policyCircularItems.length,
                complianceReviews: complianceReviewItems.length,
                evidenceFiles:
                    manualDocuments.length +
                    iqacMeetingRows.filter((row) => Boolean(row.documentId)).length +
                    qualityInitiativeRows.filter((row) => Boolean(row.documentId)).length +
                    policyCircularItems.filter((row) => Boolean(row.documentId)).length +
                    complianceReviewItems.filter((row) => Boolean(row.documentId)).length,
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
                planStrategicPriorities: plan.strategicPriorities,
                planTargets: {
                    meetings: plan.targetMeetingCount ?? 0,
                    initiatives: plan.targetInitiativeCount ?? 0,
                    policies: plan.targetPolicyCount ?? 0,
                    complianceReviews: plan.targetComplianceReviewCount ?? 0,
                },
                assigneeName: assignee?.name ?? "",
                assigneeEmail: assignee?.email ?? "",
                assigneeRole: assignee?.role ?? assignment.assigneeRole,
                status: assignment.status,
                dueDate: assignment.dueDate,
                notes: assignment.notes,
                governanceStructureNarrative: assignment.governanceStructureNarrative,
                leadershipParticipationNarrative: assignment.leadershipParticipationNarrative,
                iqacFrameworkNarrative: assignment.iqacFrameworkNarrative,
                qualityInitiativesNarrative: assignment.qualityInitiativesNarrative,
                policyGovernanceNarrative: assignment.policyGovernanceNarrative,
                complianceMonitoringNarrative: assignment.complianceMonitoringNarrative,
                stakeholderParticipationNarrative: assignment.stakeholderParticipationNarrative,
                institutionalBestPracticesNarrative: assignment.institutionalBestPracticesNarrative,
                feedbackLoopNarrative: assignment.feedbackLoopNarrative,
                actionPlan: assignment.actionPlan,
                supportingLinks: assignment.supportingLinks ?? [],
                documentIds:
                    assignment.documentIds?.map((value: Types.ObjectId) => value.toString()) ?? [],
                documents: manualDocuments,
                contributorRemarks: assignment.contributorRemarks,
                reviewRemarks: assignment.reviewRemarks,
                iqacMeetings: iqacMeetingRows,
                qualityInitiatives: qualityInitiativeRows,
                policyCirculars: policyCircularItems,
                complianceReviews: complianceReviewItems,
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
    if (!record.governanceStructureNarrative?.trim()) {
        throw new AuthError("Governance structure narrative is required before submission.", 400);
    }

    if (!record.leadershipParticipationNarrative?.trim()) {
        throw new AuthError("Leadership participation narrative is required before submission.", 400);
    }

    if (!record.qualityInitiativesNarrative?.trim()) {
        throw new AuthError("Quality initiatives narrative is required before submission.", 400);
    }

    if (!record.policyGovernanceNarrative?.trim()) {
        throw new AuthError("Policy governance narrative is required before submission.", 400);
    }

    if (
        !record.iqacMeetings.length &&
        !record.qualityInitiatives.length &&
        !record.policyCirculars.length &&
        !record.complianceReviews.length
    ) {
        throw new AuthError(
            "Add at least one IQAC meeting, quality initiative, policy/circular, or compliance review before submission.",
            400
        );
    }

    const evidenceCount =
        record.documents.length +
        record.iqacMeetings.filter((row) => Boolean(row.documentId)).length +
        record.qualityInitiatives.filter((row) => Boolean(row.documentId)).length +
        record.policyCirculars.filter((row) => Boolean(row.documentId)).length +
        record.complianceReviews.filter((row) => Boolean(row.documentId)).length +
        record.supportingLinks.length;

    if (!evidenceCount) {
        throw new AuthError(
            "Attach at least one evidence file or supporting link before submission.",
            400
        );
    }
}

export async function getGovernanceLeadershipIqacAdminConsole() {
    await dbConnect();

    const [plans, assignments, academicYears, departments, institutions, users] =
        await Promise.all([
            GovernanceLeadershipIqacPlan.find({})
                .populate("academicYearId", "yearStart yearEnd")
                .populate("institutionId", "name")
                .populate("departmentId", "name")
                .sort({ updatedAt: -1 })
                .lean(),
            GovernanceLeadershipIqacAssignment.find({})
                .populate("planId", "title")
                .populate("assigneeUserId", "name email")
                .sort({ updatedAt: -1 })
                .lean(),
            AcademicYear.find({})
                .sort({ yearStart: -1, yearEnd: -1 })
                .select("yearStart yearEnd isActive")
                .lean(),
            Department.find({}).sort({ name: 1 }).select("name institutionId").lean(),
            Institution.find({}).sort({ name: 1 }).select("name").lean(),
            User.find({ role: { $ne: "Student" }, isActive: true })
                .sort({ name: 1 })
                .select("name email department collegeName universityName")
                .lean(),
        ]);

    return {
        plans: plans.map((plan) => {
            const academicYearRef = plan.academicYearId as Record<string, any> | undefined;
            const departmentRef = plan.departmentId as Record<string, any> | undefined;
            const institutionRef = plan.institutionId as Record<string, any> | undefined;

            return {
                _id: plan._id.toString(),
                title: plan.title,
                academicYearLabel:
                    academicYearRef && "yearStart" in academicYearRef
                        ? formatAcademicYearLabel(academicYearRef.yearStart, academicYearRef.yearEnd)
                        : "",
                scopeType: plan.scopeType,
                focusArea: plan.focusArea,
                institutionId:
                    institutionRef && "_id" in institutionRef
                        ? institutionRef._id.toString()
                        : plan.institutionId?.toString(),
                institutionName: institutionRef?.name,
                departmentId:
                    departmentRef && "_id" in departmentRef
                        ? departmentRef._id.toString()
                        : plan.departmentId?.toString(),
                departmentName: departmentRef?.name,
                summary: plan.summary,
                strategicPriorities: plan.strategicPriorities,
                targetMeetingCount: plan.targetMeetingCount ?? 0,
                targetInitiativeCount: plan.targetInitiativeCount ?? 0,
                targetPolicyCount: plan.targetPolicyCount ?? 0,
                targetComplianceReviewCount: plan.targetComplianceReviewCount ?? 0,
                ownerUserId: plan.ownerUserId?.toString(),
                status: plan.status,
                updatedAt: plan.updatedAt,
            };
        }),
        assignments: assignments.map((assignment) => {
            const planRef = assignment.planId as Record<string, any> | undefined;
            const assignee = assignment.assigneeUserId as Record<string, any> | undefined;

            return {
                _id: assignment._id.toString(),
                planId:
                    planRef && "_id" in planRef
                        ? planRef._id.toString()
                        : assignment.planId?.toString(),
                planTitle: planRef?.title ?? "",
                assigneeUserId:
                    assignee && "_id" in assignee
                        ? assignee._id.toString()
                        : assignment.assigneeUserId?.toString(),
                assigneeName: assignee?.name ?? "",
                assigneeEmail: assignee?.email ?? "",
                dueDate: assignment.dueDate,
                notes: assignment.notes,
                status: assignment.status,
                isActive: Boolean(assignment.isActive),
                updatedAt: assignment.updatedAt,
            };
        }),
        academicYearOptions: academicYears.map((year) => ({
            id: year._id.toString(),
            label: formatAcademicYearLabel(year.yearStart, year.yearEnd),
            isActive: Boolean(year.isActive),
        })),
        departmentOptions: departments.map((department) => ({
            id: department._id.toString(),
            label: department.name,
            institutionId: department.institutionId?.toString(),
        })),
        institutionOptions: institutions.map((institution) => ({
            id: institution._id.toString(),
            label: institution.name,
        })),
        userOptions: users.map((user) => ({
            id: user._id.toString(),
            label: user.name,
            email: user.email,
            department: user.department,
            collegeName: user.collegeName,
            universityName: user.universityName,
        })),
    };
}

export async function createGovernanceLeadershipIqacPlan(
    actor: GovernanceLeadershipIqacActor,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = governanceLeadershipIqacPlanSchema.parse(rawInput);
    const { scope } = await resolvePlanContext({
        academicYearId: input.academicYearId,
        scopeType: input.scopeType,
        institutionId: input.institutionId,
        departmentId: input.departmentId,
    });

    if (input.ownerUserId) {
        await ensureEligibleGovernanceLeadershipIqacContributor(input.ownerUserId, {
            planScope: scope,
        });
    }

    const plan = await GovernanceLeadershipIqacPlan.create({
        academicYearId: ensureObjectId(input.academicYearId, "Academic year is invalid."),
        institutionId: input.institutionId
            ? ensureObjectId(input.institutionId, "Institution is invalid.")
            : undefined,
        departmentId: input.departmentId
            ? ensureObjectId(input.departmentId, "Department is invalid.")
            : undefined,
        ownerUserId: input.ownerUserId
            ? ensureObjectId(input.ownerUserId, "Plan owner is invalid.")
            : undefined,
        title: input.title,
        scopeType: input.scopeType,
        focusArea: input.focusArea,
        summary: input.summary || undefined,
        strategicPriorities: input.strategicPriorities || undefined,
        targetMeetingCount: input.targetMeetingCount,
        targetInitiativeCount: input.targetInitiativeCount,
        targetPolicyCount: input.targetPolicyCount,
        targetComplianceReviewCount: input.targetComplianceReviewCount,
        status: input.status,
        createdBy: new Types.ObjectId(actor.id),
        scopeDepartmentName: scope.departmentName,
        scopeCollegeName: scope.collegeName,
        scopeUniversityName: scope.universityName,
        scopeDepartmentId: scope.departmentId ? new Types.ObjectId(scope.departmentId) : undefined,
        scopeInstitutionId: scope.institutionId ? new Types.ObjectId(scope.institutionId) : undefined,
        scopeDepartmentOrganizationId: scope.departmentOrganizationId
            ? new Types.ObjectId(scope.departmentOrganizationId)
            : undefined,
        scopeCollegeOrganizationId: scope.collegeOrganizationId
            ? new Types.ObjectId(scope.collegeOrganizationId)
            : undefined,
        scopeUniversityOrganizationId: scope.universityOrganizationId
            ? new Types.ObjectId(scope.universityOrganizationId)
            : undefined,
        scopeOrganizationIds: toObjectIdList(scope.subjectOrganizationIds),
    });

    await createAuditEntry(
        actor,
        "CREATE",
        "governance_leadership_iqac_plans",
        plan._id.toString(),
        undefined,
        plan.toObject()
    );

    return plan;
}

export async function updateGovernanceLeadershipIqacPlan(
    actor: GovernanceLeadershipIqacActor,
    planId: string,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = governanceLeadershipIqacPlanUpdateSchema.parse(rawInput);
    const { plan } = await loadPlanCore(planId);
    const oldData = plan.toObject();

    const nextScopeType = input.scopeType ?? plan.scopeType;
    const nextInstitutionId =
        input.institutionId !== undefined ? input.institutionId : plan.institutionId?.toString();
    const nextDepartmentId =
        input.departmentId !== undefined ? input.departmentId : plan.departmentId?.toString();

    const { scope } = await resolvePlanContext({
        academicYearId: (input.academicYearId ?? plan.academicYearId.toString()) as string,
        scopeType: nextScopeType,
        institutionId: nextInstitutionId,
        departmentId: nextDepartmentId,
    });

    if (input.ownerUserId) {
        await ensureEligibleGovernanceLeadershipIqacContributor(input.ownerUserId, {
            planScope: scope,
        });
    }

    if (input.academicYearId) {
        plan.academicYearId = ensureObjectId(input.academicYearId, "Academic year is invalid.");
    }
    if (input.institutionId !== undefined) {
        plan.institutionId = input.institutionId
            ? ensureObjectId(input.institutionId, "Institution is invalid.")
            : undefined;
    }
    if (input.departmentId !== undefined) {
        plan.departmentId = input.departmentId
            ? ensureObjectId(input.departmentId, "Department is invalid.")
            : undefined;
    }
    if (input.ownerUserId !== undefined) {
        plan.ownerUserId = input.ownerUserId
            ? ensureObjectId(input.ownerUserId, "Plan owner is invalid.")
            : undefined;
    }
    if (input.title !== undefined) plan.title = input.title;
    if (input.scopeType !== undefined) plan.scopeType = input.scopeType;
    if (input.focusArea !== undefined) plan.focusArea = input.focusArea;
    if (input.summary !== undefined) plan.summary = input.summary || undefined;
    if (input.strategicPriorities !== undefined) plan.strategicPriorities = input.strategicPriorities || undefined;
    if (input.targetMeetingCount !== undefined) plan.targetMeetingCount = input.targetMeetingCount;
    if (input.targetInitiativeCount !== undefined) plan.targetInitiativeCount = input.targetInitiativeCount;
    if (input.targetPolicyCount !== undefined) plan.targetPolicyCount = input.targetPolicyCount;
    if (input.targetComplianceReviewCount !== undefined) plan.targetComplianceReviewCount = input.targetComplianceReviewCount;
    if (input.status !== undefined) plan.status = input.status;

    plan.scopeDepartmentName = scope.departmentName;
    plan.scopeCollegeName = scope.collegeName;
    plan.scopeUniversityName = scope.universityName;
    plan.scopeDepartmentId = scope.departmentId ? new Types.ObjectId(scope.departmentId) : undefined;
    plan.scopeInstitutionId = scope.institutionId ? new Types.ObjectId(scope.institutionId) : undefined;
    plan.scopeDepartmentOrganizationId = scope.departmentOrganizationId
        ? new Types.ObjectId(scope.departmentOrganizationId)
        : undefined;
    plan.scopeCollegeOrganizationId = scope.collegeOrganizationId
        ? new Types.ObjectId(scope.collegeOrganizationId)
        : undefined;
    plan.scopeUniversityOrganizationId = scope.universityOrganizationId
        ? new Types.ObjectId(scope.universityOrganizationId)
        : undefined;
    plan.scopeOrganizationIds = toObjectIdList(scope.subjectOrganizationIds);

    await plan.save();

    await createAuditEntry(
        actor,
        "UPDATE",
        "governance_leadership_iqac_plans",
        plan._id.toString(),
        oldData,
        plan.toObject()
    );

    return plan;
}

export async function createGovernanceLeadershipIqacAssignment(
    actor: GovernanceLeadershipIqacActor,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = governanceLeadershipIqacAssignmentSchema.parse(rawInput);
    const { plan, scope } = await loadPlanCore(input.planId);
    const assignee = await ensureEligibleGovernanceLeadershipIqacContributor(input.assigneeUserId, {
        planScope: scope,
        planOwnerUserId: plan.ownerUserId?.toString(),
    });

    const assignment = await GovernanceLeadershipIqacAssignment.create({
        planId: plan._id,
        assigneeUserId: assignee._id,
        assignedBy: new Types.ObjectId(actor.id),
        assigneeRole: assignee.role,
        dueDate: toOptionalDate(input.dueDate),
        notes: input.notes || undefined,
        status: "Draft",
        scopeDepartmentName: scope.departmentName,
        scopeCollegeName: scope.collegeName,
        scopeUniversityName: scope.universityName,
        scopeDepartmentId: scope.departmentId ? new Types.ObjectId(scope.departmentId) : undefined,
        scopeInstitutionId: scope.institutionId ? new Types.ObjectId(scope.institutionId) : undefined,
        scopeDepartmentOrganizationId: scope.departmentOrganizationId
            ? new Types.ObjectId(scope.departmentOrganizationId)
            : undefined,
        scopeCollegeOrganizationId: scope.collegeOrganizationId
            ? new Types.ObjectId(scope.collegeOrganizationId)
            : undefined,
        scopeUniversityOrganizationId: scope.universityOrganizationId
            ? new Types.ObjectId(scope.universityOrganizationId)
            : undefined,
        scopeOrganizationIds: toObjectIdList(scope.subjectOrganizationIds),
        isActive: input.isActive,
        statusLogs: [
            {
                status: "Draft",
                actorId: new Types.ObjectId(actor.id),
                actorName: actor.name,
                actorRole: actor.role,
                remarks: "Assignment created",
                changedAt: new Date(),
            },
        ],
    });

    await syncWorkflowInstanceState({
        moduleName: "GOVERNANCE_LEADERSHIP_IQAC",
        recordId: assignment._id.toString(),
        status: assignment.status,
        subjectDepartmentName: scope.departmentName,
        subjectCollegeName: scope.collegeName,
        subjectUniversityName: scope.universityName,
        subjectDepartmentId: scope.departmentId,
        subjectInstitutionId: scope.institutionId,
        subjectDepartmentOrganizationId: scope.departmentOrganizationId,
        subjectCollegeOrganizationId: scope.collegeOrganizationId,
        subjectUniversityOrganizationId: scope.universityOrganizationId,
        subjectOrganizationIds: scope.subjectOrganizationIds,
        actor,
        action: "submit",
        remarks: "Draft assignment initialized",
    });

    await createAuditEntry(
        actor,
        "CREATE",
        "governance_leadership_iqac_assignments",
        assignment._id.toString(),
        undefined,
        assignment.toObject()
    );

    return assignment;
}

export async function updateGovernanceLeadershipIqacAssignment(
    actor: GovernanceLeadershipIqacActor,
    assignmentId: string,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = governanceLeadershipIqacAssignmentUpdateSchema.parse(rawInput);
    const { assignment, plan, scope } = await loadAssignmentCore(assignmentId);
    const oldData = assignment.toObject();

    const hasContributionData =
        assignment.governanceStructureNarrative?.trim() ||
        assignment.leadershipParticipationNarrative?.trim() ||
        assignment.iqacFrameworkNarrative?.trim() ||
        assignment.qualityInitiativesNarrative?.trim() ||
        assignment.policyGovernanceNarrative?.trim() ||
        assignment.complianceMonitoringNarrative?.trim() ||
        assignment.stakeholderParticipationNarrative?.trim() ||
        assignment.institutionalBestPracticesNarrative?.trim() ||
        assignment.feedbackLoopNarrative?.trim() ||
        assignment.actionPlan?.trim() ||
        assignment.supportingLinks.length ||
        assignment.documentIds.length ||
        assignment.iqacMeetingIds.length ||
        assignment.qualityInitiativeIds.length ||
        assignment.policyCircularIds.length ||
        assignment.complianceReviewIds.length ||
        assignment.contributorRemarks?.trim();

    if (
        input.assigneeUserId &&
        hasContributionData &&
        input.assigneeUserId !== assignment.assigneeUserId.toString()
    ) {
        throw new AuthError(
            "Assignee remapping is blocked once governance leadership / IQAC contribution data exists.",
            409
        );
    }

    if (input.assigneeUserId) {
        const assignee = await ensureEligibleGovernanceLeadershipIqacContributor(input.assigneeUserId, {
            planScope: scope,
            planOwnerUserId: plan.ownerUserId?.toString(),
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
        "governance_leadership_iqac_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function saveGovernanceLeadershipIqacContributionDraft(
    actor: GovernanceLeadershipIqacActor,
    assignmentId: string,
    rawInput: unknown
) {
    await dbConnect();

    const input = governanceLeadershipIqacContributionDraftSchema.parse(rawInput);
    const { assignment, plan } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() !== actor.id) {
        throw new AuthError("This governance leadership / IQAC assignment is not mapped to your account.", 403);
    }

    if (!assignment.isActive) {
        throw new AuthError("This governance leadership / IQAC assignment is inactive.", 409);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or returned assignments can be edited.", 409);
    }

    if (plan.status === "Locked") {
        throw new AuthError("Locked governance leadership / IQAC plans cannot be edited.", 409);
    }

    const oldData = assignment.toObject();
    const [iqacMeetingIds, qualityInitiativeIds, policyCircularIds, complianceReviewIds] = await Promise.all([
        syncIqacMeetings(assignment, input),
        syncQualityInitiatives(assignment, input),
        syncPolicyCirculars(assignment, input),
        syncComplianceReviews(assignment, input),
    ]);

    assignment.governanceStructureNarrative = input.governanceStructureNarrative || undefined;
    assignment.leadershipParticipationNarrative = input.leadershipParticipationNarrative || undefined;
    assignment.iqacFrameworkNarrative = input.iqacFrameworkNarrative || undefined;
    assignment.qualityInitiativesNarrative = input.qualityInitiativesNarrative || undefined;
    assignment.policyGovernanceNarrative = input.policyGovernanceNarrative || undefined;
    assignment.complianceMonitoringNarrative = input.complianceMonitoringNarrative || undefined;
    assignment.stakeholderParticipationNarrative = input.stakeholderParticipationNarrative || undefined;
    assignment.institutionalBestPracticesNarrative = input.institutionalBestPracticesNarrative || undefined;
    assignment.feedbackLoopNarrative = input.feedbackLoopNarrative || undefined;
    assignment.actionPlan = input.actionPlan || undefined;
    assignment.iqacMeetingIds = toObjectIdList(iqacMeetingIds);
    assignment.qualityInitiativeIds = toObjectIdList(qualityInitiativeIds);
    assignment.policyCircularIds = toObjectIdList(policyCircularIds);
    assignment.complianceReviewIds = toObjectIdList(complianceReviewIds);
    assignment.supportingLinks = input.supportingLinks;
    assignment.documentIds = toObjectIdList(input.documentIds);
    assignment.contributorRemarks = input.contributorRemarks || undefined;
    await assignment.save();

    await createAuditEntry(
        actor,
        "DRAFT_SAVE",
        "governance_leadership_iqac_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function submitGovernanceLeadershipIqacAssignment(
    actor: GovernanceLeadershipIqacActor,
    assignmentId: string
) {
    await dbConnect();

    const { assignment, plan } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() !== actor.id) {
        throw new AuthError("This governance leadership / IQAC assignment is not mapped to your account.", 403);
    }

    if (!assignment.isActive) {
        throw new AuthError("This governance leadership / IQAC assignment is inactive.", 409);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or returned assignments can be submitted.", 409);
    }

    if (plan.status !== "Active") {
        throw new AuthError("The governance leadership / IQAC plan must be active before submission.", 400);
    }

    const hydrated = (await hydrateAssignments([assignment.toObject()], actor))[0];
    validateContributionForSubmission(hydrated);

    const transition = resolveWorkflowTransition(
        await getActiveWorkflowDefinition("GOVERNANCE_LEADERSHIP_IQAC"),
        assignment.status,
        "submit"
    );

    const oldData = assignment.toObject();
    assignment.status = transition.status as GovernanceLeadershipIqacWorkflowStatus;
    assignment.submittedAt = new Date();
    assignment.reviewedAt = undefined;
    assignment.approvedAt = undefined;
    assignment.approvedBy = undefined;
    assignment.reviewRemarks = undefined;
    createStatusLog(assignment, actor, assignment.status, "Submitted for review");
    await assignment.save();

    await syncWorkflowInstanceState({
        moduleName: "GOVERNANCE_LEADERSHIP_IQAC",
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
        subjectOrganizationIds:
            assignment.scopeOrganizationIds?.map((value) => value.toString()) ?? [],
        actor,
        remarks: "Contributor submitted governance leadership / IQAC record",
        action: "submit",
    });

    await createAuditEntry(
        actor,
        "SUBMIT",
        "governance_leadership_iqac_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function reviewGovernanceLeadershipIqacAssignment(
    actor: GovernanceLeadershipIqacActor,
    assignmentId: string,
    rawInput: unknown
) {
    await dbConnect();

    const input = governanceLeadershipIqacReviewSchema.parse(rawInput);
    const { assignment } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() === actor.id && actor.role !== "Admin") {
        throw new AuthError("Contributors cannot review their own governance leadership / IQAC assignment.", 403);
    }

    const workflowDefinition = await getActiveWorkflowDefinition("GOVERNANCE_LEADERSHIP_IQAC");
    const currentStage = getWorkflowStageByStatus(workflowDefinition, assignment.status);

    if (!currentStage) {
        throw new AuthError("This governance leadership / IQAC record is not pending review.", 409);
    }

    const canReview = await canActorProcessWorkflowStage({
        actor,
        moduleName: "GOVERNANCE_LEADERSHIP_IQAC",
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
        subjectOrganizationIds:
            assignment.scopeOrganizationIds?.map((value) => value.toString()) ?? [],
        stageKinds: [currentStage.kind],
    });

    if (!canReview) {
        throw new AuthError("You are not authorized to review this governance leadership / IQAC record.", 403);
    }

    const allowedDecisions =
        currentStage.kind === "final"
            ? ["Approve", "Reject"]
            : ["Forward", "Recommend", "Reject"];

    if (!allowedDecisions.includes(input.decision)) {
        throw new AuthError("This decision is not allowed for the current review stage.", 400);
    }

    const action = input.decision === "Reject" ? "reject" : "approve";
    const transition = resolveWorkflowTransition(
        workflowDefinition,
        assignment.status,
        action
    );
    const oldData = assignment.toObject();

    assignment.reviewHistory.push({
        reviewerId: new Types.ObjectId(actor.id),
        reviewerName: actor.name,
        reviewerRole: actor.role,
        stage: currentStage.label,
        decision: input.decision,
        remarks: input.remarks,
        reviewedAt: new Date(),
    });
    assignment.reviewRemarks = input.remarks;
    assignment.status = transition.status as GovernanceLeadershipIqacWorkflowStatus;
    assignment.reviewedAt = new Date();

    if (input.decision === "Reject") {
        assignment.approvedAt = undefined;
        assignment.approvedBy = undefined;
    }

    if (transition.completed && transition.status === workflowDefinition.approvedStatus) {
        assignment.approvedAt = new Date();
        assignment.approvedBy = new Types.ObjectId(actor.id);
    }

    createStatusLog(assignment, actor, assignment.status, input.remarks);
    await assignment.save();

    await syncWorkflowInstanceState({
        moduleName: "GOVERNANCE_LEADERSHIP_IQAC",
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
        subjectOrganizationIds:
            assignment.scopeOrganizationIds?.map((value) => value.toString()) ?? [],
        actor,
        remarks: input.remarks,
        action,
    });

    await createAuditEntry(
        actor,
        "REVIEW",
        "governance_leadership_iqac_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function getGovernanceLeadershipIqacContributorWorkspace(
    actor: GovernanceLeadershipIqacActor
) {
    await dbConnect();

    const assignments = await GovernanceLeadershipIqacAssignment.find({
        assigneeUserId: ensureObjectId(actor.id, "Current user is invalid."),
        isActive: true,
    })
        .sort({ updatedAt: -1 })
        .lean();

    return {
        assignments: await hydrateAssignments(assignments, actor),
    };
}

export async function getGovernanceLeadershipIqacReviewWorkspace(
    actor: GovernanceLeadershipIqacActor
) {
    await dbConnect();

    const profile = await resolveAuthorizationProfile(actor);
    let assignments: Array<Record<string, any>> = [];

    if (actor.role === "Admin") {
        assignments = await GovernanceLeadershipIqacAssignment.find({})
            .sort({ updatedAt: -1 })
            .lean();
    } else if (canListModuleRecords(profile, "GOVERNANCE_LEADERSHIP_IQAC")) {
        assignments = await GovernanceLeadershipIqacAssignment.find(
            buildAuthorizedScopeQuery(profile)
        )
            .sort({ updatedAt: -1 })
            .lean();
    }

    const records = (await hydrateAssignments(assignments, actor)).filter(
        (record) => record.permissions.canView
    );

    return {
        records,
        summary: {
            total: records.length,
            actionable: records.filter((record) => record.permissions.canReview).length,
            pendingCount: records.filter((record) =>
                ["Submitted", "IQAC Review", "Leadership Review", "Governance Review"].includes(
                    record.status
                )
            ).length,
            approvedCount: records.filter((record) => record.status === "Approved").length,
            rejectedCount: records.filter((record) => record.status === "Rejected").length,
        },
    };
}
