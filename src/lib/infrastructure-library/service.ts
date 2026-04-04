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
import InfrastructureLibraryAssignment, {
    type IInfrastructureLibraryAssignment,
    type InfrastructureLibraryWorkflowStatus,
} from "@/models/operations/infrastructure-library-assignment";
import InfrastructureLibraryFacility from "@/models/operations/infrastructure-library-facility";
import InfrastructureLibraryMaintenance from "@/models/operations/infrastructure-library-maintenance";
import InfrastructureLibraryPlan from "@/models/operations/infrastructure-library-plan";
import InfrastructureLibraryResource from "@/models/operations/infrastructure-library-resource";
import InfrastructureLibraryUsage from "@/models/operations/infrastructure-library-usage";
import AcademicYear from "@/models/reference/academic-year";
import Department from "@/models/reference/department";
import DocumentModel from "@/models/reference/document";
import Institution from "@/models/reference/institution";
import {
    infrastructureLibraryAssignmentSchema,
    infrastructureLibraryAssignmentUpdateSchema,
    infrastructureLibraryContributionDraftSchema,
    infrastructureLibraryPlanSchema,
    infrastructureLibraryPlanUpdateSchema,
    infrastructureLibraryReviewSchema,
    type InfrastructureLibraryContributionDraftInput,
} from "@/lib/infrastructure-library/validators";

type InfrastructureLibraryActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
    collegeName?: string;
    universityName?: string;
    auditContext?: AuditRequestContext;
};

type InfrastructureLibraryScope = {
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

type HydratedFacility = {
    id: string;
    facilityType: string;
    name: string;
    identifier?: string;
    buildingName?: string;
    quantity?: number;
    capacity?: number;
    areaSqFt?: number;
    ictEnabled: boolean;
    status: string;
    utilizationPercent?: number;
    remarks?: string;
    documentId?: string;
    document?: HydratedDocument;
};

type HydratedLibraryResource = {
    id: string;
    resourceType: string;
    title: string;
    category?: string;
    vendorPublisher?: string;
    accessionNumber?: string;
    isbnIssn?: string;
    copiesCount?: number;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
    accessMode: string;
    availabilityStatus: string;
    usageCount?: number;
    remarks?: string;
    documentId?: string;
    document?: HydratedDocument;
};

type HydratedUsage = {
    id: string;
    usageType: string;
    title: string;
    periodLabel?: string;
    usageCount?: number;
    satisfactionScore?: number;
    targetGroup?: string;
    remarks?: string;
    documentId?: string;
    document?: HydratedDocument;
};

type HydratedMaintenance = {
    id: string;
    assetCategory: string;
    assetName: string;
    maintenanceType: string;
    vendorName?: string;
    serviceDate?: Date;
    nextDueDate?: Date;
    status: string;
    costAmount?: number;
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
        classrooms: number;
        laboratories: number;
        books: number;
        journals: number;
        eResources: number;
        bandwidthMbps: number;
    };
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: InfrastructureLibraryWorkflowStatus;
    dueDate?: Date;
    notes?: string;
    infrastructureOverview?: string;
    libraryOverview?: string;
    digitalAccessStrategy?: string;
    maintenanceProtocol?: string;
    utilizationInsights?: string;
    accessibilitySupport?: string;
    greenPractices?: string;
    safetyCompliance?: string;
    studentSupportServices?: string;
    resourceGapActionPlan?: string;
    supportingLinks: string[];
    documentIds: string[];
    documents: HydratedDocument[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    facilities: HydratedFacility[];
    libraryResources: HydratedLibraryResource[];
    usageRows: HydratedUsage[];
    maintenanceRows: HydratedMaintenance[];
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

const infrastructureCoordinatorPattern =
    /(library|librarian|infrastructure|facility|estate|maintenance|campus|asset|lab|laborator|resource|automation|digital library|ict)/i;

function ensureAdminActor(actor: InfrastructureLibraryActor) {
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

function buildPlanSubjectScope(scope: InfrastructureLibraryScope) {
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
    assignment: Pick<IInfrastructureLibraryAssignment, "statusLogs">,
    actor: InfrastructureLibraryActor,
    status: InfrastructureLibraryWorkflowStatus,
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
    facilities: number;
    libraryResources: number;
    usageRows: number;
    maintenanceRows: number;
    evidenceFiles: number;
    supportingLinks: number;
}) {
    const narrativeCount = Object.values(record.narratives).filter((value) => value?.trim()).length;

    return [
        `${narrativeCount} narrative section(s)`,
        `${record.facilities} facility row(s)`,
        `${record.libraryResources} library row(s)`,
        `${record.usageRows} usage row(s)`,
        `${record.maintenanceRows} maintenance row(s)`,
        `${record.evidenceFiles + record.supportingLinks} evidence link(s/files)`,
    ].join(" · ");
}

async function createAuditEntry(
    actor: InfrastructureLibraryActor,
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
            } satisfies InfrastructureLibraryScope,
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
        } satisfies InfrastructureLibraryScope,
    };
}

async function loadPlanCore(planId: string) {
    if (!Types.ObjectId.isValid(planId)) {
        throw new AuthError("Infrastructure & library plan is invalid.", 400);
    }

    const plan = await InfrastructureLibraryPlan.findById(planId);
    if (!plan) {
        throw new AuthError("Infrastructure & library plan was not found.", 404);
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
        throw new AuthError("Infrastructure & library assignment is invalid.", 400);
    }

    const assignment = await InfrastructureLibraryAssignment.findById(assignmentId);
    if (!assignment) {
        throw new AuthError("Infrastructure & library assignment was not found.", 404);
    }

    const { plan, ...context } = await loadPlanCore(assignment.planId.toString());
    return { assignment, plan, ...context };
}

async function ensureEligibleInfrastructureContributor(
    userId: string,
    options: {
        planScope: InfrastructureLibraryScope;
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
            "Only active faculty users can be assigned infrastructure & library work.",
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
        infrastructureCoordinatorPattern.test(
            `${role.roleName ?? ""} ${role.committeeName ?? ""}`
        )
    );
    const hasScopedWorkflowRole =
        canViewModuleRecord(
            authorizationProfile,
            "INFRASTRUCTURE_LIBRARY",
            subjectScope
        ) &&
        authorizationProfile.workflowRoles.some((role) =>
            [
                "INFRASTRUCTURE_LIBRARY_COMMITTEE",
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
            "INFRASTRUCTURE_LIBRARY",
            subjectScope
        ) &&
        committeeMemberships.some((membership) => {
            const committee = membership.committeeId as { committeeType?: string } | null;
            return committee?.committeeType === "INFRASTRUCTURE_LIBRARY_REVIEW";
        });

    if (!hasCoordinatorRole && !hasScopedWorkflowRole && !hasCommitteeMembership) {
        throw new AuthError(
            "Only the plan owner or an active scoped infrastructure/library coordinator can be assigned to this portfolio.",
            400
        );
    }

    return user;
}

async function syncFacilities(
    assignment: IInfrastructureLibraryAssignment,
    input: InfrastructureLibraryContributionDraftInput
) {
    const existingRows = await InfrastructureLibraryFacility.find({
        assignmentId: assignment._id,
    });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.facilities.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            facilityType: row.facilityType,
            name: row.name,
            identifier: row.identifier || undefined,
            buildingName: row.buildingName || undefined,
            quantity: row.quantity,
            capacity: row.capacity,
            areaSqFt: row.areaSqFt,
            ictEnabled: row.ictEnabled,
            status: row.status,
            utilizationPercent: row.utilizationPercent,
            remarks: row.remarks || undefined,
            documentId: row.documentId ? ensureObjectId(row.documentId, "Facility document is invalid.") : undefined,
            displayOrder: row.displayOrder ?? index + 1,
        };

        if (row._id && existingById.has(row._id)) {
            const existing = existingById.get(row._id)!;
            existing.set(payload);
            await existing.save();
            keepIds.add(existing._id.toString());
            continue;
        }

        const created = await InfrastructureLibraryFacility.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await InfrastructureLibraryFacility.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function syncLibraryResources(
    assignment: IInfrastructureLibraryAssignment,
    input: InfrastructureLibraryContributionDraftInput
) {
    const existingRows = await InfrastructureLibraryResource.find({
        assignmentId: assignment._id,
    });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.libraryResources.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            resourceType: row.resourceType,
            title: row.title,
            category: row.category || undefined,
            vendorPublisher: row.vendorPublisher || undefined,
            accessionNumber: row.accessionNumber || undefined,
            isbnIssn: row.isbnIssn || undefined,
            copiesCount: row.copiesCount,
            subscriptionStartDate: toOptionalDate(row.subscriptionStartDate),
            subscriptionEndDate: toOptionalDate(row.subscriptionEndDate),
            accessMode: row.accessMode,
            availabilityStatus: row.availabilityStatus,
            usageCount: row.usageCount,
            remarks: row.remarks || undefined,
            documentId: row.documentId ? ensureObjectId(row.documentId, "Library resource document is invalid.") : undefined,
            displayOrder: row.displayOrder ?? index + 1,
        };

        if (row._id && existingById.has(row._id)) {
            const existing = existingById.get(row._id)!;
            existing.set(payload);
            await existing.save();
            keepIds.add(existing._id.toString());
            continue;
        }

        const created = await InfrastructureLibraryResource.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await InfrastructureLibraryResource.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function syncUsageRows(
    assignment: IInfrastructureLibraryAssignment,
    input: InfrastructureLibraryContributionDraftInput
) {
    const existingRows = await InfrastructureLibraryUsage.find({
        assignmentId: assignment._id,
    });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.usageRows.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            usageType: row.usageType,
            title: row.title,
            periodLabel: row.periodLabel || undefined,
            usageCount: row.usageCount,
            satisfactionScore: row.satisfactionScore,
            targetGroup: row.targetGroup || undefined,
            remarks: row.remarks || undefined,
            documentId: row.documentId ? ensureObjectId(row.documentId, "Usage document is invalid.") : undefined,
            displayOrder: row.displayOrder ?? index + 1,
        };

        if (row._id && existingById.has(row._id)) {
            const existing = existingById.get(row._id)!;
            existing.set(payload);
            await existing.save();
            keepIds.add(existing._id.toString());
            continue;
        }

        const created = await InfrastructureLibraryUsage.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await InfrastructureLibraryUsage.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function syncMaintenanceRows(
    assignment: IInfrastructureLibraryAssignment,
    input: InfrastructureLibraryContributionDraftInput
) {
    const existingRows = await InfrastructureLibraryMaintenance.find({
        assignmentId: assignment._id,
    });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.maintenanceRows.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            assetCategory: row.assetCategory,
            assetName: row.assetName,
            maintenanceType: row.maintenanceType,
            vendorName: row.vendorName || undefined,
            serviceDate: toOptionalDate(row.serviceDate),
            nextDueDate: toOptionalDate(row.nextDueDate),
            status: row.status,
            costAmount: row.costAmount,
            remarks: row.remarks || undefined,
            documentId: row.documentId ? ensureObjectId(row.documentId, "Maintenance document is invalid.") : undefined,
            displayOrder: row.displayOrder ?? index + 1,
        };

        if (row._id && existingById.has(row._id)) {
            const existing = existingById.get(row._id)!;
            existing.set(payload);
            await existing.save();
            keepIds.add(existing._id.toString());
            continue;
        }

        const created = await InfrastructureLibraryMaintenance.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await InfrastructureLibraryMaintenance.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function hydrateAssignments(
    assignments: Array<Record<string, any>>,
    actor?: InfrastructureLibraryActor
) {
    const planIds = uniqueStrings(assignments.map((row) => row.planId?.toString()));
    const assigneeIds = uniqueStrings(assignments.map((row) => row.assigneeUserId?.toString()));
    const assignmentIds = uniqueStrings(assignments.map((row) => row._id?.toString()));

    const [plans, assignees, facilities, resources, usageRows, maintenanceRows] = await Promise.all([
        planIds.length
            ? InfrastructureLibraryPlan.find({ _id: { $in: toObjectIdList(planIds) } })
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
            ? InfrastructureLibraryFacility.find({
                  assignmentId: { $in: toObjectIdList(assignmentIds) },
              })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? InfrastructureLibraryResource.find({
                  assignmentId: { $in: toObjectIdList(assignmentIds) },
              })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? InfrastructureLibraryUsage.find({
                  assignmentId: { $in: toObjectIdList(assignmentIds) },
              })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? InfrastructureLibraryMaintenance.find({
                  assignmentId: { $in: toObjectIdList(assignmentIds) },
              })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
    ]);

    const planById = new Map(plans.map((row) => [row._id.toString(), row]));
    const assigneeById = new Map(assignees.map((row) => [row._id.toString(), row]));

    const facilityByAssignmentId = new Map<string, Array<Record<string, any>>>();
    const resourceByAssignmentId = new Map<string, Array<Record<string, any>>>();
    const usageByAssignmentId = new Map<string, Array<Record<string, any>>>();
    const maintenanceByAssignmentId = new Map<string, Array<Record<string, any>>>();

    for (const row of facilities) {
        const key = row.assignmentId.toString();
        facilityByAssignmentId.set(key, [...(facilityByAssignmentId.get(key) ?? []), row]);
    }
    for (const row of resources) {
        const key = row.assignmentId.toString();
        resourceByAssignmentId.set(key, [...(resourceByAssignmentId.get(key) ?? []), row]);
    }
    for (const row of usageRows) {
        const key = row.assignmentId.toString();
        usageByAssignmentId.set(key, [...(usageByAssignmentId.get(key) ?? []), row]);
    }
    for (const row of maintenanceRows) {
        const key = row.assignmentId.toString();
        maintenanceByAssignmentId.set(key, [...(maintenanceByAssignmentId.get(key) ?? []), row]);
    }

    const rowDocumentIds = uniqueStrings([
        ...facilities.map((row) => row.documentId?.toString()),
        ...resources.map((row) => row.documentId?.toString()),
        ...usageRows.map((row) => row.documentId?.toString()),
        ...maintenanceRows.map((row) => row.documentId?.toString()),
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

    const workflowDefinition = await getActiveWorkflowDefinition("INFRASTRUCTURE_LIBRARY");
    const profile = actor ? await resolveAuthorizationProfile(actor) : null;

    return Promise.all(
        assignments.map(async (assignment) => {
            const plan = planById.get(assignment.planId.toString());
            if (!plan) {
                throw new AuthError(
                    "Infrastructure & library assignment references a missing plan.",
                    400
                );
            }

            const assignee = assigneeById.get(assignment.assigneeUserId.toString());
            const facilityRows =
                (facilityByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                    id: row._id.toString(),
                    facilityType: row.facilityType,
                    name: row.name,
                    identifier: row.identifier,
                    buildingName: row.buildingName,
                    quantity: row.quantity,
                    capacity: row.capacity,
                    areaSqFt: row.areaSqFt,
                    ictEnabled: Boolean(row.ictEnabled),
                    status: row.status,
                    utilizationPercent: row.utilizationPercent,
                    remarks: row.remarks,
                    documentId: row.documentId?.toString(),
                    document: row.documentId
                        ? documentById.get(row.documentId.toString())
                        : undefined,
                }));
            const libraryRows =
                (resourceByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                    id: row._id.toString(),
                    resourceType: row.resourceType,
                    title: row.title,
                    category: row.category,
                    vendorPublisher: row.vendorPublisher,
                    accessionNumber: row.accessionNumber,
                    isbnIssn: row.isbnIssn,
                    copiesCount: row.copiesCount,
                    subscriptionStartDate: row.subscriptionStartDate,
                    subscriptionEndDate: row.subscriptionEndDate,
                    accessMode: row.accessMode,
                    availabilityStatus: row.availabilityStatus,
                    usageCount: row.usageCount,
                    remarks: row.remarks,
                    documentId: row.documentId?.toString(),
                    document: row.documentId
                        ? documentById.get(row.documentId.toString())
                        : undefined,
                }));
            const usageItems =
                (usageByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                    id: row._id.toString(),
                    usageType: row.usageType,
                    title: row.title,
                    periodLabel: row.periodLabel,
                    usageCount: row.usageCount,
                    satisfactionScore: row.satisfactionScore,
                    targetGroup: row.targetGroup,
                    remarks: row.remarks,
                    documentId: row.documentId?.toString(),
                    document: row.documentId
                        ? documentById.get(row.documentId.toString())
                        : undefined,
                }));
            const maintenanceItems =
                (maintenanceByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                    id: row._id.toString(),
                    assetCategory: row.assetCategory,
                    assetName: row.assetName,
                    maintenanceType: row.maintenanceType,
                    vendorName: row.vendorName,
                    serviceDate: row.serviceDate,
                    nextDueDate: row.nextDueDate,
                    status: row.status,
                    costAmount: row.costAmount,
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
                      ? canViewModuleRecord(profile, "INFRASTRUCTURE_LIBRARY", {
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
                          moduleName: "INFRASTRUCTURE_LIBRARY",
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
                    infrastructureOverview: assignment.infrastructureOverview,
                    libraryOverview: assignment.libraryOverview,
                    digitalAccessStrategy: assignment.digitalAccessStrategy,
                    maintenanceProtocol: assignment.maintenanceProtocol,
                    utilizationInsights: assignment.utilizationInsights,
                    accessibilitySupport: assignment.accessibilitySupport,
                    greenPractices: assignment.greenPractices,
                    safetyCompliance: assignment.safetyCompliance,
                    studentSupportServices: assignment.studentSupportServices,
                    resourceGapActionPlan: assignment.resourceGapActionPlan,
                },
                facilities: facilityRows.length,
                libraryResources: libraryRows.length,
                usageRows: usageItems.length,
                maintenanceRows: maintenanceItems.length,
                evidenceFiles:
                    manualDocuments.length +
                    facilityRows.filter((row) => Boolean(row.documentId)).length +
                    libraryRows.filter((row) => Boolean(row.documentId)).length +
                    usageItems.filter((row) => Boolean(row.documentId)).length +
                    maintenanceItems.filter((row) => Boolean(row.documentId)).length,
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
                    classrooms: plan.targetClassroomCount ?? 0,
                    laboratories: plan.targetLaboratoryCount ?? 0,
                    books: plan.targetBookCount ?? 0,
                    journals: plan.targetJournalCount ?? 0,
                    eResources: plan.targetEresourceCount ?? 0,
                    bandwidthMbps: plan.targetBandwidthMbps ?? 0,
                },
                assigneeName: assignee?.name ?? "",
                assigneeEmail: assignee?.email ?? "",
                assigneeRole: assignee?.role ?? assignment.assigneeRole,
                status: assignment.status,
                dueDate: assignment.dueDate,
                notes: assignment.notes,
                infrastructureOverview: assignment.infrastructureOverview,
                libraryOverview: assignment.libraryOverview,
                digitalAccessStrategy: assignment.digitalAccessStrategy,
                maintenanceProtocol: assignment.maintenanceProtocol,
                utilizationInsights: assignment.utilizationInsights,
                accessibilitySupport: assignment.accessibilitySupport,
                greenPractices: assignment.greenPractices,
                safetyCompliance: assignment.safetyCompliance,
                studentSupportServices: assignment.studentSupportServices,
                resourceGapActionPlan: assignment.resourceGapActionPlan,
                supportingLinks: assignment.supportingLinks ?? [],
                documentIds:
                    assignment.documentIds?.map((value: Types.ObjectId) => value.toString()) ?? [],
                documents: manualDocuments,
                contributorRemarks: assignment.contributorRemarks,
                reviewRemarks: assignment.reviewRemarks,
                facilities: facilityRows,
                libraryResources: libraryRows,
                usageRows: usageItems,
                maintenanceRows: maintenanceItems,
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
    if (!record.infrastructureOverview?.trim()) {
        throw new AuthError("Infrastructure overview is required before submission.", 400);
    }

    if (!record.libraryOverview?.trim()) {
        throw new AuthError("Library overview is required before submission.", 400);
    }

    if (!record.maintenanceProtocol?.trim()) {
        throw new AuthError("Maintenance protocol is required before submission.", 400);
    }

    if (!record.utilizationInsights?.trim()) {
        throw new AuthError("Utilization insights are required before submission.", 400);
    }

    if (
        !record.facilities.length &&
        !record.libraryResources.length &&
        !record.usageRows.length &&
        !record.maintenanceRows.length
    ) {
        throw new AuthError(
            "Add at least one facility, library, usage, or maintenance record before submission.",
            400
        );
    }

    const evidenceCount =
        record.documents.length +
        record.facilities.filter((row) => Boolean(row.documentId)).length +
        record.libraryResources.filter((row) => Boolean(row.documentId)).length +
        record.usageRows.filter((row) => Boolean(row.documentId)).length +
        record.maintenanceRows.filter((row) => Boolean(row.documentId)).length +
        record.supportingLinks.length;

    if (!evidenceCount) {
        throw new AuthError(
            "Attach at least one evidence file or supporting link before submission.",
            400
        );
    }
}

export async function getInfrastructureLibraryAdminConsole() {
    await dbConnect();

    const [plans, assignments, academicYears, departments, institutions, users] =
        await Promise.all([
            InfrastructureLibraryPlan.find({})
                .populate("academicYearId", "yearStart yearEnd")
                .populate("institutionId", "name")
                .populate("departmentId", "name")
                .sort({ updatedAt: -1 })
                .lean(),
            InfrastructureLibraryAssignment.find({})
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
                targetClassroomCount: plan.targetClassroomCount ?? 0,
                targetLaboratoryCount: plan.targetLaboratoryCount ?? 0,
                targetBookCount: plan.targetBookCount ?? 0,
                targetJournalCount: plan.targetJournalCount ?? 0,
                targetEresourceCount: plan.targetEresourceCount ?? 0,
                targetBandwidthMbps: plan.targetBandwidthMbps ?? 0,
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

export async function createInfrastructureLibraryPlan(
    actor: InfrastructureLibraryActor,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = infrastructureLibraryPlanSchema.parse(rawInput);
    const { scope } = await resolvePlanContext({
        academicYearId: input.academicYearId,
        scopeType: input.scopeType,
        institutionId: input.institutionId,
        departmentId: input.departmentId,
    });

    if (input.facultyOwnerUserId) {
        await ensureEligibleInfrastructureContributor(input.facultyOwnerUserId, {
            planScope: scope,
            planAcademicYearId: input.academicYearId,
        });
    }

    const plan = await InfrastructureLibraryPlan.create({
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
        targetClassroomCount: input.targetClassroomCount,
        targetLaboratoryCount: input.targetLaboratoryCount,
        targetBookCount: input.targetBookCount,
        targetJournalCount: input.targetJournalCount,
        targetEresourceCount: input.targetEresourceCount,
        targetBandwidthMbps: input.targetBandwidthMbps,
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
        "infrastructure_library_plans",
        plan._id.toString(),
        undefined,
        plan.toObject()
    );

    return plan;
}

export async function updateInfrastructureLibraryPlan(
    actor: InfrastructureLibraryActor,
    planId: string,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = infrastructureLibraryPlanUpdateSchema.parse(rawInput);
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
        await ensureEligibleInfrastructureContributor(input.facultyOwnerUserId, {
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
    if (input.targetClassroomCount !== undefined) plan.targetClassroomCount = input.targetClassroomCount;
    if (input.targetLaboratoryCount !== undefined) plan.targetLaboratoryCount = input.targetLaboratoryCount;
    if (input.targetBookCount !== undefined) plan.targetBookCount = input.targetBookCount;
    if (input.targetJournalCount !== undefined) plan.targetJournalCount = input.targetJournalCount;
    if (input.targetEresourceCount !== undefined) plan.targetEresourceCount = input.targetEresourceCount;
    if (input.targetBandwidthMbps !== undefined) plan.targetBandwidthMbps = input.targetBandwidthMbps;
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
        "infrastructure_library_plans",
        plan._id.toString(),
        oldData,
        plan.toObject()
    );

    return plan;
}

export async function createInfrastructureLibraryAssignment(
    actor: InfrastructureLibraryActor,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = infrastructureLibraryAssignmentSchema.parse(rawInput);
    const { plan, scope } = await loadPlanCore(input.planId);
    const assignee = await ensureEligibleInfrastructureContributor(input.assigneeUserId, {
        planScope: scope,
        planAcademicYearId: plan.academicYearId.toString(),
        planFacultyOwnerUserId: plan.facultyOwnerUserId?.toString(),
    });

    const assignment = await InfrastructureLibraryAssignment.create({
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
        moduleName: "INFRASTRUCTURE_LIBRARY",
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
        "infrastructure_library_assignments",
        assignment._id.toString(),
        undefined,
        assignment.toObject()
    );

    return assignment;
}

export async function updateInfrastructureLibraryAssignment(
    actor: InfrastructureLibraryActor,
    assignmentId: string,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = infrastructureLibraryAssignmentUpdateSchema.parse(rawInput);
    const { assignment, plan, scope } = await loadAssignmentCore(assignmentId);
    const oldData = assignment.toObject();

    const hasContributionData =
        assignment.infrastructureOverview?.trim() ||
        assignment.libraryOverview?.trim() ||
        assignment.digitalAccessStrategy?.trim() ||
        assignment.maintenanceProtocol?.trim() ||
        assignment.utilizationInsights?.trim() ||
        assignment.accessibilitySupport?.trim() ||
        assignment.greenPractices?.trim() ||
        assignment.safetyCompliance?.trim() ||
        assignment.studentSupportServices?.trim() ||
        assignment.resourceGapActionPlan?.trim() ||
        assignment.supportingLinks.length ||
        assignment.documentIds.length ||
        assignment.facilityIds.length ||
        assignment.libraryResourceIds.length ||
        assignment.usageIds.length ||
        assignment.maintenanceIds.length ||
        assignment.contributorRemarks?.trim();

    if (
        input.assigneeUserId &&
        hasContributionData &&
        input.assigneeUserId !== assignment.assigneeUserId.toString()
    ) {
        throw new AuthError(
            "Assignee remapping is blocked once infrastructure/library contribution data exists.",
            409
        );
    }

    if (input.assigneeUserId) {
        const assignee = await ensureEligibleInfrastructureContributor(input.assigneeUserId, {
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
        "infrastructure_library_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function saveInfrastructureLibraryContributionDraft(
    actor: InfrastructureLibraryActor,
    assignmentId: string,
    rawInput: unknown
) {
    await dbConnect();

    const input = infrastructureLibraryContributionDraftSchema.parse(rawInput);
    const { assignment, plan } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() !== actor.id) {
        throw new AuthError("This infrastructure & library assignment is not mapped to your account.", 403);
    }

    if (!assignment.isActive) {
        throw new AuthError("This infrastructure & library assignment is inactive.", 409);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or returned assignments can be edited.", 409);
    }

    if (plan.status === "Locked") {
        throw new AuthError("Locked infrastructure/library plans cannot be edited.", 409);
    }

    const oldData = assignment.toObject();
    const [facilityIds, libraryResourceIds, usageIds, maintenanceIds] = await Promise.all([
        syncFacilities(assignment, input),
        syncLibraryResources(assignment, input),
        syncUsageRows(assignment, input),
        syncMaintenanceRows(assignment, input),
    ]);

    assignment.infrastructureOverview = input.infrastructureOverview || undefined;
    assignment.libraryOverview = input.libraryOverview || undefined;
    assignment.digitalAccessStrategy = input.digitalAccessStrategy || undefined;
    assignment.maintenanceProtocol = input.maintenanceProtocol || undefined;
    assignment.utilizationInsights = input.utilizationInsights || undefined;
    assignment.accessibilitySupport = input.accessibilitySupport || undefined;
    assignment.greenPractices = input.greenPractices || undefined;
    assignment.safetyCompliance = input.safetyCompliance || undefined;
    assignment.studentSupportServices = input.studentSupportServices || undefined;
    assignment.resourceGapActionPlan = input.resourceGapActionPlan || undefined;
    assignment.facilityIds = toObjectIdList(facilityIds);
    assignment.libraryResourceIds = toObjectIdList(libraryResourceIds);
    assignment.usageIds = toObjectIdList(usageIds);
    assignment.maintenanceIds = toObjectIdList(maintenanceIds);
    assignment.supportingLinks = input.supportingLinks;
    assignment.documentIds = toObjectIdList(input.documentIds);
    assignment.contributorRemarks = input.contributorRemarks || undefined;
    await assignment.save();

    await createAuditEntry(
        actor,
        "DRAFT_SAVE",
        "infrastructure_library_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function submitInfrastructureLibraryAssignment(
    actor: InfrastructureLibraryActor,
    assignmentId: string
) {
    await dbConnect();

    const { assignment, plan } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() !== actor.id) {
        throw new AuthError("This infrastructure & library assignment is not mapped to your account.", 403);
    }

    if (!assignment.isActive) {
        throw new AuthError("This infrastructure & library assignment is inactive.", 409);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or returned assignments can be submitted.", 409);
    }

    if (plan.status !== "Active") {
        throw new AuthError("The infrastructure/library plan must be active before submission.", 400);
    }

    const hydrated = (await hydrateAssignments([assignment.toObject()], actor))[0];
    validateContributionForSubmission(hydrated);

    const transition = resolveWorkflowTransition(
        await getActiveWorkflowDefinition("INFRASTRUCTURE_LIBRARY"),
        assignment.status,
        "submit"
    );

    const oldData = assignment.toObject();
    assignment.status = transition.status as InfrastructureLibraryWorkflowStatus;
    assignment.submittedAt = new Date();
    assignment.reviewedAt = undefined;
    assignment.approvedAt = undefined;
    assignment.approvedBy = undefined;
    assignment.reviewRemarks = undefined;
    createStatusLog(assignment, actor, assignment.status, "Submitted for review");
    await assignment.save();

    await syncWorkflowInstanceState({
        moduleName: "INFRASTRUCTURE_LIBRARY",
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
        remarks: "Contributor submitted infrastructure/library record",
        action: "submit",
    });

    await createAuditEntry(
        actor,
        "SUBMIT",
        "infrastructure_library_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function reviewInfrastructureLibraryAssignment(
    actor: InfrastructureLibraryActor,
    assignmentId: string,
    rawInput: unknown
) {
    await dbConnect();

    const input = infrastructureLibraryReviewSchema.parse(rawInput);
    const { assignment } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() === actor.id && actor.role !== "Admin") {
        throw new AuthError("Contributors cannot review their own infrastructure/library assignment.", 403);
    }

    const workflowDefinition = await getActiveWorkflowDefinition("INFRASTRUCTURE_LIBRARY");
    const currentStage = getWorkflowStageByStatus(workflowDefinition, assignment.status);

    if (!currentStage) {
        throw new AuthError("This infrastructure/library record is not pending review.", 409);
    }

    const canReview = await canActorProcessWorkflowStage({
        actor,
        moduleName: "INFRASTRUCTURE_LIBRARY",
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
        throw new AuthError("You are not authorized to review this infrastructure/library record.", 403);
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
    assignment.status = transition.status as InfrastructureLibraryWorkflowStatus;
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
        moduleName: "INFRASTRUCTURE_LIBRARY",
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
        "infrastructure_library_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function getInfrastructureLibraryContributorWorkspace(
    actor: InfrastructureLibraryActor
) {
    await dbConnect();

    const assignments = await InfrastructureLibraryAssignment.find({
        assigneeUserId: ensureObjectId(actor.id, "Current user is invalid."),
        isActive: true,
    })
        .sort({ updatedAt: -1 })
        .lean();

    return {
        assignments: await hydrateAssignments(assignments, actor),
    };
}

export async function getInfrastructureLibraryReviewWorkspace(
    actor: InfrastructureLibraryActor
) {
    await dbConnect();

    const profile = await resolveAuthorizationProfile(actor);
    let assignments: Array<Record<string, any>> = [];

    if (actor.role === "Admin") {
        assignments = await InfrastructureLibraryAssignment.find({})
            .sort({ updatedAt: -1 })
            .lean();
    } else if (canListModuleRecords(profile, "INFRASTRUCTURE_LIBRARY")) {
        assignments = await InfrastructureLibraryAssignment.find(
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
                ["Submitted", "Infrastructure Review", "Under Review", "Committee Review"].includes(
                    record.status
                )
            ).length,
            approvedCount: records.filter((record) => record.status === "Approved").length,
            rejectedCount: records.filter((record) => record.status === "Rejected").length,
        },
    };
}
