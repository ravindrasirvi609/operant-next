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
import User from "@/models/core/user";
import Faculty from "@/models/faculty/faculty";
import FacultyAdminRole from "@/models/faculty/faculty-admin-role";
import StudentSupportGovernanceAssignment, {
    type IStudentSupportGovernanceAssignment,
    type StudentSupportGovernanceWorkflowStatus,
} from "@/models/student/student-support-governance-assignment";
import StudentSupportMentorGroup from "@/models/student/student-support-mentor-group";
import StudentSupportRepresentation from "@/models/student/student-support-representation";
import StudentSupportGovernancePlan from "@/models/student/student-support-governance-plan";
import StudentSupportGrievance from "@/models/student/student-support-grievance";
import StudentSupportProgression from "@/models/student/student-support-progression";
import AcademicYear from "@/models/reference/academic-year";
import Department from "@/models/reference/department";
import DocumentModel from "@/models/reference/document";
import Institution from "@/models/reference/institution";
import {
    studentSupportGovernanceAssignmentSchema,
    studentSupportGovernanceAssignmentUpdateSchema,
    studentSupportGovernanceContributionDraftSchema,
    studentSupportGovernancePlanSchema,
    studentSupportGovernancePlanUpdateSchema,
    studentSupportGovernanceReviewSchema,
    type StudentSupportGovernanceContributionDraftInput,
} from "@/lib/student-support-governance/validators";

type StudentSupportGovernanceActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
    collegeName?: string;
    universityName?: string;
    auditContext?: AuditRequestContext;
};

type StudentSupportGovernanceScope = {
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

type HydratedMentorGroup = {
    id: string;
    groupName: string;
    programName?: string;
    batchLabel?: string;
    mentorName?: string;
    menteeCount?: number;
    meetingCount?: number;
    supportThemes?: string;
    escalatedCount?: number;
    actionTaken?: string;
    remarks?: string;
    documentId?: string;
    document?: HydratedDocument;
};

type HydratedGrievance = {
    id: string;
    category: string;
    referenceNumber?: string;
    lodgedByType: string;
    receivedDate?: Date;
    resolvedDate?: Date;
    status: string;
    resolutionDays?: number;
    committeeName?: string;
    resolutionSummary?: string;
    remarks?: string;
    documentId?: string;
    document?: HydratedDocument;
};

type HydratedProgression = {
    id: string;
    progressionType: string;
    title: string;
    batchLabel?: string;
    programName?: string;
    destinationName?: string;
    studentCount?: number;
    medianPackageLpa?: number;
    status: string;
    remarks?: string;
    documentId?: string;
    document?: HydratedDocument;
};

type HydratedRepresentation = {
    id: string;
    representationType: string;
    bodyName: string;
    roleTitle?: string;
    studentCount?: number;
    meetingCount?: number;
    outcomeSummary?: string;
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
    planStrategyGoals?: string;
    planTargets: {
        mentorGroups: number;
        grievanceClosures: number;
        scholarshipBeneficiaries: number;
        placements: number;
        higherStudies: number;
        representationBodies: number;
    };
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: StudentSupportGovernanceWorkflowStatus;
    dueDate?: Date;
    notes?: string;
    mentoringFramework?: string;
    grievanceRedressalSystem?: string;
    scholarshipSupport?: string;
    progressionTracking?: string;
    placementReadiness?: string;
    studentRepresentation?: string;
    wellbeingSupport?: string;
    inclusionSupport?: string;
    feedbackMechanism?: string;
    actionPlan?: string;
    supportingLinks: string[];
    documentIds: string[];
    documents: HydratedDocument[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    mentorGroups: HydratedMentorGroup[];
    grievances: HydratedGrievance[];
    progressionRows: HydratedProgression[];
    representationRows: HydratedRepresentation[];
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

const studentSupportCoordinatorPattern =
    /(student welfare|student support|mentor|mentee|grievance|counselling|counseling|placement|progression|scholarship|student council|dean student|dean students|anti ragging|wellbeing|inclusion)/i;

function ensureAdminActor(actor: StudentSupportGovernanceActor) {
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

function buildPlanSubjectScope(scope: StudentSupportGovernanceScope) {
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
    assignment: Pick<IStudentSupportGovernanceAssignment, "statusLogs">,
    actor: StudentSupportGovernanceActor,
    status: StudentSupportGovernanceWorkflowStatus,
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
    mentorGroups: number;
    grievances: number;
    progressionRows: number;
    representationRows: number;
    evidenceFiles: number;
    supportingLinks: number;
}) {
    const narrativeCount = Object.values(record.narratives).filter((value) => value?.trim()).length;

    return [
        `${narrativeCount} narrative section(s)`,
        `${record.mentorGroups} mentor group row(s)`,
        `${record.grievances} grievance row(s)`,
        `${record.progressionRows} progression row(s)`,
        `${record.representationRows} representation row(s)`,
        `${record.evidenceFiles + record.supportingLinks} evidence link(s/files)`,
    ].join(" · ");
}

async function createAuditEntry(
    actor: StudentSupportGovernanceActor,
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
            } satisfies StudentSupportGovernanceScope,
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
        } satisfies StudentSupportGovernanceScope,
    };
}

async function loadPlanCore(planId: string) {
    if (!Types.ObjectId.isValid(planId)) {
        throw new AuthError("Student support & governance plan is invalid.", 400);
    }

    const plan = await StudentSupportGovernancePlan.findById(planId);
    if (!plan) {
        throw new AuthError("Student support & governance plan was not found.", 404);
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
        throw new AuthError("Student support & governance assignment is invalid.", 400);
    }

    const assignment = await StudentSupportGovernanceAssignment.findById(assignmentId);
    if (!assignment) {
        throw new AuthError("Student support & governance assignment was not found.", 404);
    }

    const { plan, ...context } = await loadPlanCore(assignment.planId.toString());
    return { assignment, plan, ...context };
}

async function ensureEligibleStudentSupportContributor(
    userId: string,
    options: {
        planScope: StudentSupportGovernanceScope;
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
            "Only active faculty users can be assigned student support & governance work.",
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

    const [authorizationProfile, adminRoles, committeeMemberships] = await Promise.all([
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

    const hasCoordinatorRole = adminRoles.some((role) =>
        studentSupportCoordinatorPattern.test(
            `${role.roleName ?? ""} ${role.committeeName ?? ""}`
        )
    );
    const hasScopedWorkflowRole =
        canViewModuleRecord(
            authorizationProfile,
            "STUDENT_SUPPORT_GOVERNANCE",
            subjectScope
        ) &&
        authorizationProfile.workflowRoles.some((role) =>
            [
                "STUDENT_SUPPORT_GOVERNANCE_COMMITTEE",
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
            "STUDENT_SUPPORT_GOVERNANCE",
            subjectScope
        ) &&
        committeeMemberships.some((membership) => {
            const committee = membership.committeeId as { committeeType?: string } | null;
            return committee?.committeeType === "STUDENT_SUPPORT_GOVERNANCE_REVIEW";
        });

    if (!hasCoordinatorRole && !hasScopedWorkflowRole && !hasCommitteeMembership) {
        throw new AuthError(
            "Only the plan owner or an active scoped student-support coordinator can be assigned to this portfolio.",
            400
        );
    }

    return user;
}

async function syncMentorGroups(
    assignment: IStudentSupportGovernanceAssignment,
    input: StudentSupportGovernanceContributionDraftInput
) {
    const existingRows = await StudentSupportMentorGroup.find({
        assignmentId: assignment._id,
    });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.mentorGroups.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            groupName: row.groupName,
            programName: row.programName || undefined,
            batchLabel: row.batchLabel || undefined,
            mentorName: row.mentorName || undefined,
            menteeCount: row.menteeCount,
            meetingCount: row.meetingCount,
            supportThemes: row.supportThemes || undefined,
            escalatedCount: row.escalatedCount,
            actionTaken: row.actionTaken || undefined,
            remarks: row.remarks || undefined,
            documentId: row.documentId
                ? ensureObjectId(row.documentId, "Mentor-group document is invalid.")
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

        const created = await StudentSupportMentorGroup.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await StudentSupportMentorGroup.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function syncGrievances(
    assignment: IStudentSupportGovernanceAssignment,
    input: StudentSupportGovernanceContributionDraftInput
) {
    const existingRows = await StudentSupportGrievance.find({
        assignmentId: assignment._id,
    });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.grievances.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            category: row.category,
            referenceNumber: row.referenceNumber || undefined,
            lodgedByType: row.lodgedByType,
            receivedDate: toOptionalDate(row.receivedDate),
            resolvedDate: toOptionalDate(row.resolvedDate),
            status: row.status,
            resolutionDays: row.resolutionDays,
            committeeName: row.committeeName || undefined,
            resolutionSummary: row.resolutionSummary || undefined,
            remarks: row.remarks || undefined,
            documentId: row.documentId
                ? ensureObjectId(row.documentId, "Grievance document is invalid.")
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

        const created = await StudentSupportGrievance.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await StudentSupportGrievance.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function syncProgressions(
    assignment: IStudentSupportGovernanceAssignment,
    input: StudentSupportGovernanceContributionDraftInput
) {
    const existingRows = await StudentSupportProgression.find({
        assignmentId: assignment._id,
    });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.progressionRows.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            progressionType: row.progressionType,
            title: row.title,
            batchLabel: row.batchLabel || undefined,
            programName: row.programName || undefined,
            destinationName: row.destinationName || undefined,
            studentCount: row.studentCount,
            medianPackageLpa: row.medianPackageLpa,
            status: row.status,
            remarks: row.remarks || undefined,
            documentId: row.documentId
                ? ensureObjectId(row.documentId, "Progression document is invalid.")
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

        const created = await StudentSupportProgression.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await StudentSupportProgression.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function syncRepresentations(
    assignment: IStudentSupportGovernanceAssignment,
    input: StudentSupportGovernanceContributionDraftInput
) {
    const existingRows = await StudentSupportRepresentation.find({
        assignmentId: assignment._id,
    });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.representationRows.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            representationType: row.representationType,
            bodyName: row.bodyName,
            roleTitle: row.roleTitle || undefined,
            studentCount: row.studentCount,
            meetingCount: row.meetingCount,
            outcomeSummary: row.outcomeSummary || undefined,
            remarks: row.remarks || undefined,
            documentId: row.documentId
                ? ensureObjectId(row.documentId, "Representation document is invalid.")
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

        const created = await StudentSupportRepresentation.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await StudentSupportRepresentation.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function hydrateAssignments(
    assignments: Array<Record<string, any>>,
    actor?: StudentSupportGovernanceActor
) {
    const planIds = uniqueStrings(assignments.map((row) => row.planId?.toString()));
    const assigneeIds = uniqueStrings(assignments.map((row) => row.assigneeUserId?.toString()));
    const assignmentIds = uniqueStrings(assignments.map((row) => row._id?.toString()));

    const [plans, assignees, mentorGroups, grievances, progressionRows, representationRows] =
        await Promise.all([
        planIds.length
            ? StudentSupportGovernancePlan.find({ _id: { $in: toObjectIdList(planIds) } })
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
            ? StudentSupportMentorGroup.find({
                  assignmentId: { $in: toObjectIdList(assignmentIds) },
              })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? StudentSupportGrievance.find({
                  assignmentId: { $in: toObjectIdList(assignmentIds) },
              })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? StudentSupportProgression.find({
                  assignmentId: { $in: toObjectIdList(assignmentIds) },
              })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? StudentSupportRepresentation.find({
                  assignmentId: { $in: toObjectIdList(assignmentIds) },
              })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
    ]);

    const planById = new Map(plans.map((row) => [row._id.toString(), row]));
    const assigneeById = new Map(assignees.map((row) => [row._id.toString(), row]));

    const mentorGroupByAssignmentId = new Map<string, Array<Record<string, any>>>();
    const grievanceByAssignmentId = new Map<string, Array<Record<string, any>>>();
    const progressionByAssignmentId = new Map<string, Array<Record<string, any>>>();
    const representationByAssignmentId = new Map<string, Array<Record<string, any>>>();

    for (const row of mentorGroups) {
        const key = row.assignmentId.toString();
        mentorGroupByAssignmentId.set(key, [...(mentorGroupByAssignmentId.get(key) ?? []), row]);
    }
    for (const row of grievances) {
        const key = row.assignmentId.toString();
        grievanceByAssignmentId.set(key, [...(grievanceByAssignmentId.get(key) ?? []), row]);
    }
    for (const row of progressionRows) {
        const key = row.assignmentId.toString();
        progressionByAssignmentId.set(key, [...(progressionByAssignmentId.get(key) ?? []), row]);
    }
    for (const row of representationRows) {
        const key = row.assignmentId.toString();
        representationByAssignmentId.set(key, [
            ...(representationByAssignmentId.get(key) ?? []),
            row,
        ]);
    }

    const rowDocumentIds = uniqueStrings([
        ...mentorGroups.map((row) => row.documentId?.toString()),
        ...grievances.map((row) => row.documentId?.toString()),
        ...progressionRows.map((row) => row.documentId?.toString()),
        ...representationRows.map((row) => row.documentId?.toString()),
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

    const workflowDefinition = await getActiveWorkflowDefinition("STUDENT_SUPPORT_GOVERNANCE");
    const profile = actor ? await resolveAuthorizationProfile(actor) : null;

    return Promise.all(
        assignments.map(async (assignment) => {
            const plan = planById.get(assignment.planId.toString());
            if (!plan) {
                throw new AuthError(
                    "Student support & governance assignment references a missing plan.",
                    400
                );
            }

            const assignee = assigneeById.get(assignment.assigneeUserId.toString());
            const mentorGroupRows =
                (mentorGroupByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                    id: row._id.toString(),
                    groupName: row.groupName,
                    programName: row.programName,
                    batchLabel: row.batchLabel,
                    mentorName: row.mentorName,
                    menteeCount: row.menteeCount,
                    meetingCount: row.meetingCount,
                    supportThemes: row.supportThemes,
                    escalatedCount: row.escalatedCount,
                    actionTaken: row.actionTaken,
                    remarks: row.remarks,
                    documentId: row.documentId?.toString(),
                    document: row.documentId
                        ? documentById.get(row.documentId.toString())
                        : undefined,
                }));
            const grievanceRows =
                (grievanceByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                    id: row._id.toString(),
                    category: row.category,
                    referenceNumber: row.referenceNumber,
                    lodgedByType: row.lodgedByType,
                    receivedDate: row.receivedDate,
                    resolvedDate: row.resolvedDate,
                    status: row.status,
                    resolutionDays: row.resolutionDays,
                    committeeName: row.committeeName,
                    resolutionSummary: row.resolutionSummary,
                    remarks: row.remarks,
                    documentId: row.documentId?.toString(),
                    document: row.documentId
                        ? documentById.get(row.documentId.toString())
                        : undefined,
                }));
            const progressionItems =
                (progressionByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                    id: row._id.toString(),
                    progressionType: row.progressionType,
                    title: row.title,
                    batchLabel: row.batchLabel,
                    programName: row.programName,
                    destinationName: row.destinationName,
                    studentCount: row.studentCount,
                    medianPackageLpa: row.medianPackageLpa,
                    status: row.status,
                    remarks: row.remarks,
                    documentId: row.documentId?.toString(),
                    document: row.documentId
                        ? documentById.get(row.documentId.toString())
                        : undefined,
                }));
            const representationItems =
                (representationByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                    id: row._id.toString(),
                    representationType: row.representationType,
                    bodyName: row.bodyName,
                    roleTitle: row.roleTitle,
                    studentCount: row.studentCount,
                    meetingCount: row.meetingCount,
                    outcomeSummary: row.outcomeSummary,
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
                      ? canViewModuleRecord(profile, "STUDENT_SUPPORT_GOVERNANCE", {
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
                          moduleName: "STUDENT_SUPPORT_GOVERNANCE",
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
                    mentoringFramework: assignment.mentoringFramework,
                    grievanceRedressalSystem: assignment.grievanceRedressalSystem,
                    scholarshipSupport: assignment.scholarshipSupport,
                    progressionTracking: assignment.progressionTracking,
                    placementReadiness: assignment.placementReadiness,
                    studentRepresentation: assignment.studentRepresentation,
                    wellbeingSupport: assignment.wellbeingSupport,
                    inclusionSupport: assignment.inclusionSupport,
                    feedbackMechanism: assignment.feedbackMechanism,
                    actionPlan: assignment.actionPlan,
                },
                mentorGroups: mentorGroupRows.length,
                grievances: grievanceRows.length,
                progressionRows: progressionItems.length,
                representationRows: representationItems.length,
                evidenceFiles:
                    manualDocuments.length +
                    mentorGroupRows.filter((row) => Boolean(row.documentId)).length +
                    grievanceRows.filter((row) => Boolean(row.documentId)).length +
                    progressionItems.filter((row) => Boolean(row.documentId)).length +
                    representationItems.filter((row) => Boolean(row.documentId)).length,
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
                    mentorGroups: plan.targetMentorGroupCount ?? 0,
                    grievanceClosures: plan.targetGrievanceClosureCount ?? 0,
                    scholarshipBeneficiaries: plan.targetScholarshipBeneficiaryCount ?? 0,
                    placements: plan.targetPlacementCount ?? 0,
                    higherStudies: plan.targetHigherStudiesCount ?? 0,
                    representationBodies: plan.targetRepresentationCount ?? 0,
                },
                assigneeName: assignee?.name ?? "",
                assigneeEmail: assignee?.email ?? "",
                assigneeRole: assignee?.role ?? assignment.assigneeRole,
                status: assignment.status,
                dueDate: assignment.dueDate,
                notes: assignment.notes,
                mentoringFramework: assignment.mentoringFramework,
                grievanceRedressalSystem: assignment.grievanceRedressalSystem,
                scholarshipSupport: assignment.scholarshipSupport,
                progressionTracking: assignment.progressionTracking,
                placementReadiness: assignment.placementReadiness,
                studentRepresentation: assignment.studentRepresentation,
                wellbeingSupport: assignment.wellbeingSupport,
                inclusionSupport: assignment.inclusionSupport,
                feedbackMechanism: assignment.feedbackMechanism,
                actionPlan: assignment.actionPlan,
                supportingLinks: assignment.supportingLinks ?? [],
                documentIds:
                    assignment.documentIds?.map((value: Types.ObjectId) => value.toString()) ?? [],
                documents: manualDocuments,
                contributorRemarks: assignment.contributorRemarks,
                reviewRemarks: assignment.reviewRemarks,
                mentorGroups: mentorGroupRows,
                grievances: grievanceRows,
                progressionRows: progressionItems,
                representationRows: representationItems,
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
    if (!record.mentoringFramework?.trim()) {
        throw new AuthError("Mentoring framework is required before submission.", 400);
    }

    if (!record.grievanceRedressalSystem?.trim()) {
        throw new AuthError("Grievance redressal system is required before submission.", 400);
    }

    if (!record.progressionTracking?.trim()) {
        throw new AuthError("Progression tracking summary is required before submission.", 400);
    }

    if (!record.placementReadiness?.trim()) {
        throw new AuthError("Placement readiness narrative is required before submission.", 400);
    }

    if (
        !record.mentorGroups.length &&
        !record.grievances.length &&
        !record.progressionRows.length &&
        !record.representationRows.length
    ) {
        throw new AuthError(
            "Add at least one mentor-group, grievance, progression, or representation record before submission.",
            400
        );
    }

    const evidenceCount =
        record.documents.length +
        record.mentorGroups.filter((row) => Boolean(row.documentId)).length +
        record.grievances.filter((row) => Boolean(row.documentId)).length +
        record.progressionRows.filter((row) => Boolean(row.documentId)).length +
        record.representationRows.filter((row) => Boolean(row.documentId)).length +
        record.supportingLinks.length;

    if (!evidenceCount) {
        throw new AuthError(
            "Attach at least one evidence file or supporting link before submission.",
            400
        );
    }
}

export async function getStudentSupportGovernanceAdminConsole() {
    await dbConnect();

    const [plans, assignments, academicYears, departments, institutions, users] =
        await Promise.all([
            StudentSupportGovernancePlan.find({})
                .populate("academicYearId", "yearStart yearEnd")
                .populate("institutionId", "name")
                .populate("departmentId", "name")
                .sort({ updatedAt: -1 })
                .lean(),
            StudentSupportGovernanceAssignment.find({})
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
            User.find({ role: "Faculty", isActive: true })
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
                strategyGoals: plan.strategyGoals,
                targetMentorGroupCount: plan.targetMentorGroupCount ?? 0,
                targetGrievanceClosureCount: plan.targetGrievanceClosureCount ?? 0,
                targetScholarshipBeneficiaryCount: plan.targetScholarshipBeneficiaryCount ?? 0,
                targetPlacementCount: plan.targetPlacementCount ?? 0,
                targetHigherStudiesCount: plan.targetHigherStudiesCount ?? 0,
                targetRepresentationCount: plan.targetRepresentationCount ?? 0,
                facultyOwnerUserId: plan.facultyOwnerUserId?.toString(),
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

export async function createStudentSupportGovernancePlan(
    actor: StudentSupportGovernanceActor,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = studentSupportGovernancePlanSchema.parse(rawInput);
    const { scope } = await resolvePlanContext({
        academicYearId: input.academicYearId,
        scopeType: input.scopeType,
        institutionId: input.institutionId,
        departmentId: input.departmentId,
    });

    if (input.facultyOwnerUserId) {
        await ensureEligibleStudentSupportContributor(input.facultyOwnerUserId, {
            planScope: scope,
            planAcademicYearId: input.academicYearId,
        });
    }

    const plan = await StudentSupportGovernancePlan.create({
        academicYearId: ensureObjectId(input.academicYearId, "Academic year is invalid."),
        institutionId: input.institutionId
            ? ensureObjectId(input.institutionId, "Institution is invalid.")
            : undefined,
        departmentId: input.departmentId
            ? ensureObjectId(input.departmentId, "Department is invalid.")
            : undefined,
        facultyOwnerUserId: input.facultyOwnerUserId
            ? ensureObjectId(input.facultyOwnerUserId, "Plan owner is invalid.")
            : undefined,
        title: input.title,
        scopeType: input.scopeType,
        focusArea: input.focusArea,
        summary: input.summary || undefined,
        strategyGoals: input.strategyGoals || undefined,
        targetMentorGroupCount: input.targetMentorGroupCount,
        targetGrievanceClosureCount: input.targetGrievanceClosureCount,
        targetScholarshipBeneficiaryCount: input.targetScholarshipBeneficiaryCount,
        targetPlacementCount: input.targetPlacementCount,
        targetHigherStudiesCount: input.targetHigherStudiesCount,
        targetRepresentationCount: input.targetRepresentationCount,
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
        "student_support_governance_plans",
        plan._id.toString(),
        undefined,
        plan.toObject()
    );

    return plan;
}

export async function updateStudentSupportGovernancePlan(
    actor: StudentSupportGovernanceActor,
    planId: string,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = studentSupportGovernancePlanUpdateSchema.parse(rawInput);
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

    if (input.facultyOwnerUserId) {
        await ensureEligibleStudentSupportContributor(input.facultyOwnerUserId, {
            planScope: scope,
            planAcademicYearId: input.academicYearId ?? plan.academicYearId.toString(),
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
    if (input.facultyOwnerUserId !== undefined) {
        plan.facultyOwnerUserId = input.facultyOwnerUserId
            ? ensureObjectId(input.facultyOwnerUserId, "Plan owner is invalid.")
            : undefined;
    }
    if (input.title !== undefined) plan.title = input.title;
    if (input.scopeType !== undefined) plan.scopeType = input.scopeType;
    if (input.focusArea !== undefined) plan.focusArea = input.focusArea;
    if (input.summary !== undefined) plan.summary = input.summary || undefined;
    if (input.strategyGoals !== undefined) plan.strategyGoals = input.strategyGoals || undefined;
    if (input.targetMentorGroupCount !== undefined) plan.targetMentorGroupCount = input.targetMentorGroupCount;
    if (input.targetGrievanceClosureCount !== undefined) plan.targetGrievanceClosureCount = input.targetGrievanceClosureCount;
    if (input.targetScholarshipBeneficiaryCount !== undefined) plan.targetScholarshipBeneficiaryCount = input.targetScholarshipBeneficiaryCount;
    if (input.targetPlacementCount !== undefined) plan.targetPlacementCount = input.targetPlacementCount;
    if (input.targetHigherStudiesCount !== undefined) plan.targetHigherStudiesCount = input.targetHigherStudiesCount;
    if (input.targetRepresentationCount !== undefined) plan.targetRepresentationCount = input.targetRepresentationCount;
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
        "student_support_governance_plans",
        plan._id.toString(),
        oldData,
        plan.toObject()
    );

    return plan;
}

export async function createStudentSupportGovernanceAssignment(
    actor: StudentSupportGovernanceActor,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = studentSupportGovernanceAssignmentSchema.parse(rawInput);
    const { plan, scope } = await loadPlanCore(input.planId);
    const assignee = await ensureEligibleStudentSupportContributor(input.assigneeUserId, {
        planScope: scope,
        planAcademicYearId: plan.academicYearId.toString(),
        planFacultyOwnerUserId: plan.facultyOwnerUserId?.toString(),
    });

    const assignment = await StudentSupportGovernanceAssignment.create({
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
        moduleName: "STUDENT_SUPPORT_GOVERNANCE",
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
        "student_support_governance_assignments",
        assignment._id.toString(),
        undefined,
        assignment.toObject()
    );

    return assignment;
}

export async function updateStudentSupportGovernanceAssignment(
    actor: StudentSupportGovernanceActor,
    assignmentId: string,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = studentSupportGovernanceAssignmentUpdateSchema.parse(rawInput);
    const { assignment, plan, scope } = await loadAssignmentCore(assignmentId);
    const oldData = assignment.toObject();

    const hasContributionData =
        assignment.mentoringFramework?.trim() ||
        assignment.grievanceRedressalSystem?.trim() ||
        assignment.scholarshipSupport?.trim() ||
        assignment.progressionTracking?.trim() ||
        assignment.placementReadiness?.trim() ||
        assignment.studentRepresentation?.trim() ||
        assignment.wellbeingSupport?.trim() ||
        assignment.inclusionSupport?.trim() ||
        assignment.feedbackMechanism?.trim() ||
        assignment.actionPlan?.trim() ||
        assignment.supportingLinks.length ||
        assignment.documentIds.length ||
        assignment.mentorGroupIds.length ||
        assignment.grievanceIds.length ||
        assignment.progressionIds.length ||
        assignment.representationIds.length ||
        assignment.contributorRemarks?.trim();

    if (
        input.assigneeUserId &&
        hasContributionData &&
        input.assigneeUserId !== assignment.assigneeUserId.toString()
    ) {
        throw new AuthError(
            "Assignee remapping is blocked once student support & governance contribution data exists.",
            409
        );
    }

    if (input.assigneeUserId) {
        const assignee = await ensureEligibleStudentSupportContributor(input.assigneeUserId, {
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
        "student_support_governance_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function saveStudentSupportGovernanceContributionDraft(
    actor: StudentSupportGovernanceActor,
    assignmentId: string,
    rawInput: unknown
) {
    await dbConnect();

    const input = studentSupportGovernanceContributionDraftSchema.parse(rawInput);
    const { assignment, plan } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() !== actor.id) {
        throw new AuthError("This student support & governance assignment is not mapped to your account.", 403);
    }

    if (!assignment.isActive) {
        throw new AuthError("This student support & governance assignment is inactive.", 409);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or returned assignments can be edited.", 409);
    }

    if (plan.status === "Locked") {
        throw new AuthError("Locked student support & governance plans cannot be edited.", 409);
    }

    const oldData = assignment.toObject();
    const [mentorGroupIds, grievanceIds, progressionIds, representationIds] = await Promise.all([
        syncMentorGroups(assignment, input),
        syncGrievances(assignment, input),
        syncProgressions(assignment, input),
        syncRepresentations(assignment, input),
    ]);

    assignment.mentoringFramework = input.mentoringFramework || undefined;
    assignment.grievanceRedressalSystem = input.grievanceRedressalSystem || undefined;
    assignment.scholarshipSupport = input.scholarshipSupport || undefined;
    assignment.progressionTracking = input.progressionTracking || undefined;
    assignment.placementReadiness = input.placementReadiness || undefined;
    assignment.studentRepresentation = input.studentRepresentation || undefined;
    assignment.wellbeingSupport = input.wellbeingSupport || undefined;
    assignment.inclusionSupport = input.inclusionSupport || undefined;
    assignment.feedbackMechanism = input.feedbackMechanism || undefined;
    assignment.actionPlan = input.actionPlan || undefined;
    assignment.mentorGroupIds = toObjectIdList(mentorGroupIds);
    assignment.grievanceIds = toObjectIdList(grievanceIds);
    assignment.progressionIds = toObjectIdList(progressionIds);
    assignment.representationIds = toObjectIdList(representationIds);
    assignment.supportingLinks = input.supportingLinks;
    assignment.documentIds = toObjectIdList(input.documentIds);
    assignment.contributorRemarks = input.contributorRemarks || undefined;
    await assignment.save();

    await createAuditEntry(
        actor,
        "DRAFT_SAVE",
        "student_support_governance_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function submitStudentSupportGovernanceAssignment(
    actor: StudentSupportGovernanceActor,
    assignmentId: string
) {
    await dbConnect();

    const { assignment, plan } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() !== actor.id) {
        throw new AuthError("This student support & governance assignment is not mapped to your account.", 403);
    }

    if (!assignment.isActive) {
        throw new AuthError("This student support & governance assignment is inactive.", 409);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or returned assignments can be submitted.", 409);
    }

    if (plan.status !== "Active") {
        throw new AuthError("The student support & governance plan must be active before submission.", 400);
    }

    const hydrated = (await hydrateAssignments([assignment.toObject()], actor))[0];
    validateContributionForSubmission(hydrated);

    const transition = resolveWorkflowTransition(
        await getActiveWorkflowDefinition("STUDENT_SUPPORT_GOVERNANCE"),
        assignment.status,
        "submit"
    );

    const oldData = assignment.toObject();
    assignment.status = transition.status as StudentSupportGovernanceWorkflowStatus;
    assignment.submittedAt = new Date();
    assignment.reviewedAt = undefined;
    assignment.approvedAt = undefined;
    assignment.approvedBy = undefined;
    assignment.reviewRemarks = undefined;
    createStatusLog(assignment, actor, assignment.status, "Submitted for review");
    await assignment.save();

    await syncWorkflowInstanceState({
        moduleName: "STUDENT_SUPPORT_GOVERNANCE",
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
        remarks: "Contributor submitted student support & governance record",
        action: "submit",
    });

    await createAuditEntry(
        actor,
        "SUBMIT",
        "student_support_governance_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function reviewStudentSupportGovernanceAssignment(
    actor: StudentSupportGovernanceActor,
    assignmentId: string,
    rawInput: unknown
) {
    await dbConnect();

    const input = studentSupportGovernanceReviewSchema.parse(rawInput);
    const { assignment } = await loadAssignmentCore(assignmentId);
    const workflowDefinition = await getActiveWorkflowDefinition("STUDENT_SUPPORT_GOVERNANCE");
    const currentStage = getWorkflowStageByStatus(workflowDefinition, assignment.status);

    if (!currentStage) {
        throw new AuthError("This student support & governance record is not pending review.", 409);
    }

    const canReview = await canActorProcessWorkflowStage({
        actor,
        moduleName: "STUDENT_SUPPORT_GOVERNANCE",
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
        throw new AuthError("You are not authorized to review this student support & governance record.", 403);
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
    assignment.status = transition.status as StudentSupportGovernanceWorkflowStatus;
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
        moduleName: "STUDENT_SUPPORT_GOVERNANCE",
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
        "student_support_governance_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function getStudentSupportGovernanceContributorWorkspace(
    actor: StudentSupportGovernanceActor
) {
    await dbConnect();

    const assignments = await StudentSupportGovernanceAssignment.find({
        assigneeUserId: ensureObjectId(actor.id, "Current user is invalid."),
        isActive: true,
    })
        .sort({ updatedAt: -1 })
        .lean();

    return {
        assignments: await hydrateAssignments(assignments, actor),
    };
}

export async function getStudentSupportGovernanceReviewWorkspace(
    actor: StudentSupportGovernanceActor
) {
    await dbConnect();

    const profile = await resolveAuthorizationProfile(actor);
    let assignments: Array<Record<string, any>> = [];

    if (actor.role === "Admin") {
        assignments = await StudentSupportGovernanceAssignment.find({})
            .sort({ updatedAt: -1 })
            .lean();
    } else if (canListModuleRecords(profile, "STUDENT_SUPPORT_GOVERNANCE")) {
        assignments = await StudentSupportGovernanceAssignment.find(
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
                ["Submitted", "Student Support Review", "Under Review", "Governance Review"].includes(
                    record.status
                )
            ).length,
            approvedCount: records.filter((record) => record.status === "Approved").length,
            rejectedCount: records.filter((record) => record.status === "Rejected").length,
        },
    };
}
