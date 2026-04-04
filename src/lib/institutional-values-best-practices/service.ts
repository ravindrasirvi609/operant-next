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
import CommunityOutreachProgram from "@/models/quality/community-outreach-program";
import CodeOfConductRecord from "@/models/quality/code-of-conduct-record";
import EnergyConsumptionRecord from "@/models/quality/energy-consumption-record";
import EnvironmentalResourceRecord from "@/models/quality/environmental-resource-record";
import EthicsProgram from "@/models/quality/ethics-program";
import GenderEquityProgram from "@/models/quality/gender-equity-program";
import GreenCampusInitiative from "@/models/quality/green-campus-initiative";
import InclusivenessFacility from "@/models/quality/inclusiveness-facility";
import InstitutionalBestPractice from "@/models/quality/institutional-best-practice";
import InstitutionalDistinctiveness from "@/models/quality/institutional-distinctiveness";
import InstitutionalValuesBestPracticesAssignment, {
    type IInstitutionalValuesBestPracticesAssignment,
    type InstitutionalValuesBestPracticesWorkflowStatus,
} from "@/models/quality/institutional-values-best-practices-assignment";
import InstitutionalValuesBestPracticesPlan from "@/models/quality/institutional-values-best-practices-plan";
import OutreachParticipant from "@/models/quality/outreach-participant";
import SustainabilityAudit from "@/models/quality/sustainability-audit";
import WasteManagementPractice from "@/models/quality/waste-management-practice";
import WaterManagementSystem from "@/models/quality/water-management-system";
import AcademicYear from "@/models/reference/academic-year";
import Department from "@/models/reference/department";
import DocumentModel from "@/models/reference/document";
import Institution from "@/models/reference/institution";
import {
    institutionalValuesBestPracticesAssignmentSchema,
    institutionalValuesBestPracticesAssignmentUpdateSchema,
    institutionalValuesBestPracticesContributionDraftSchema,
    institutionalValuesBestPracticesPlanSchema,
    institutionalValuesBestPracticesPlanUpdateSchema,
    institutionalValuesBestPracticesReviewSchema,
    type InstitutionalValuesBestPracticesContributionDraftInput,
} from "@/lib/institutional-values-best-practices/validators";

type InstitutionalValuesBestPracticesActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
    collegeName?: string;
    universityName?: string;
    auditContext?: AuditRequestContext;
};

type InstitutionalValuesBestPracticesScope = {
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

type SectionDocumentRow = {
    id: string;
    documentId?: string;
    document?: HydratedDocument;
};

type HydratedAssignmentRecord = {
    _id: string;
    planId: string;
    planTitle: string;
    academicYearLabel: string;
    scopeType: string;
    theme: string;
    unitLabel: string;
    planStatus: string;
    planOverview?: string;
    planStrategicPriorities?: string;
    planTargets: {
        environmentalRecords: number;
        inclusionRecords: number;
        ethicsRecords: number;
        outreachPrograms: number;
        bestPractices: number;
        distinctivenessNarratives: number;
        audits: number;
    };
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: InstitutionalValuesBestPracticesWorkflowStatus;
    dueDate?: Date;
    notes?: string;
    environmentalSustainabilityNarrative?: string;
    inclusivenessNarrative?: string;
    humanValuesNarrative?: string;
    communityOutreachNarrative?: string;
    bestPracticesNarrative?: string;
    institutionalDistinctivenessNarrative?: string;
    sustainabilityAuditNarrative?: string;
    actionPlan?: string;
    supportingLinks: string[];
    documentIds: string[];
    documents: HydratedDocument[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    greenCampusInitiatives: Array<
        SectionDocumentRow & {
            initiativeType: string;
            title: string;
            startDate?: Date;
            endDate?: Date;
            status: string;
            impactDescription?: string;
        }
    >;
    environmentalResourceRecords: Array<
        SectionDocumentRow & {
            resourceCategory: string;
            resourceType?: string;
            recordedMonth?: string;
            unitsConsumed?: number;
            costIncurred?: number;
            installationYear?: number;
            capacityLiters?: number;
            methodology?: string;
            status: string;
        }
    >;
    energyConsumptionRecords: Array<
        SectionDocumentRow & {
            energySource: string;
            academicYearId?: string;
            unitsConsumed?: number;
            costIncurred?: number;
            recordedMonth?: string;
        }
    >;
    waterManagementSystems: Array<
        SectionDocumentRow & {
            systemType: string;
            installationYear?: number;
            capacityLiters?: number;
            status: string;
            methodology?: string;
        }
    >;
    wasteManagementPractices: Array<
        SectionDocumentRow & {
            practiceType: string;
            methodology?: string;
            implementedDate?: Date;
            impactSummary?: string;
        }
    >;
    genderEquityPrograms: Array<
        SectionDocumentRow & {
            programType: string;
            title: string;
            conductedDate?: Date;
            participantsCount?: number;
            impactNotes?: string;
        }
    >;
    inclusivenessFacilities: Array<
        SectionDocumentRow & {
            facilityType: string;
            locationDescription?: string;
            establishedYear?: number;
            status: string;
        }
    >;
    ethicsPrograms: Array<
        SectionDocumentRow & {
            title: string;
            programCategory: string;
            programDate?: Date;
            targetAudience?: string;
            stakeholderType: string;
            status: string;
        }
    >;
    codeOfConductRecords: Array<{
        id: string;
        title: string;
        stakeholderType: string;
        effectiveDate?: Date;
        reviewCycleYears?: number;
        status: string;
        policyDocumentId?: string;
        document?: HydratedDocument;
    }>;
    communityOutreachPrograms: Array<
        SectionDocumentRow & {
            activityType: string;
            title: string;
            location?: string;
            startDate?: Date;
            endDate?: Date;
            beneficiariesCount?: number;
            impactSummary?: string;
        }
    >;
    outreachParticipants: Array<{
        id: string;
        programId?: string;
        programTitle?: string;
        programDisplayOrder?: number;
        participantType: string;
        participantId?: string;
        participantName?: string;
        hoursContributed?: number;
        certificateDocumentId?: string;
        certificateDocument?: HydratedDocument;
    }>;
    institutionalBestPractices: Array<
        SectionDocumentRow & {
            practiceTitle: string;
            objectives?: string;
            context?: string;
            implementationDetails?: string;
            evidenceOfSuccess?: string;
            problemsEncountered?: string;
            resourcesRequired?: string;
        }
    >;
    institutionalDistinctivenessEntries: Array<
        SectionDocumentRow & {
            distinctFeatureTitle: string;
            description?: string;
            impactOnStudents?: string;
            societalImpact?: string;
        }
    >;
    sustainabilityAudits: Array<
        SectionDocumentRow & {
            auditType: string;
            auditAgency?: string;
            auditYear?: number;
            auditScore?: number;
            recommendations?: string;
        }
    >;
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

const institutionalValuesCoordinatorPattern =
    /(iqac|quality|green|environment|eco|extension|nss|csr|outreach|ethics|welfare|principal|director|hod|office head)/i;

function ensureAdminActor(actor: InstitutionalValuesBestPracticesActor) {
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

function toOptionalNumber(value: unknown) {
    if (value === null || value === undefined || value === "") {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
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

function buildPlanSubjectScope(scope: InstitutionalValuesBestPracticesScope) {
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
    assignment: Pick<IInstitutionalValuesBestPracticesAssignment, "statusLogs">,
    actor: InstitutionalValuesBestPracticesActor,
    status: InstitutionalValuesBestPracticesWorkflowStatus,
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
    sectionCount: number;
    evidenceFiles: number;
    supportingLinks: number;
}) {
    const narrativeCount = Object.values(record.narratives).filter((value) => value?.trim()).length;

    return [
        `${narrativeCount} narrative section(s)`,
        `${record.sectionCount} structured row(s)`,
        `${record.evidenceFiles + record.supportingLinks} evidence link(s/files)`,
    ].join(" · ");
}

async function createAuditEntry(
    actor: InstitutionalValuesBestPracticesActor,
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
            } satisfies InstitutionalValuesBestPracticesScope,
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
        } satisfies InstitutionalValuesBestPracticesScope,
    };
}

async function loadPlanCore(planId: string) {
    if (!Types.ObjectId.isValid(planId)) {
        throw new AuthError("Institutional values plan is invalid.", 400);
    }

    const plan = await InstitutionalValuesBestPracticesPlan.findById(planId);
    if (!plan) {
        throw new AuthError("Institutional values plan was not found.", 404);
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
        throw new AuthError("Institutional values assignment is invalid.", 400);
    }

    const assignment = await InstitutionalValuesBestPracticesAssignment.findById(assignmentId);
    if (!assignment) {
        throw new AuthError("Institutional values assignment was not found.", 404);
    }

    const { plan, ...context } = await loadPlanCore(assignment.planId.toString());
    return { assignment, plan, ...context };
}

async function ensureEligibleInstitutionalValuesBestPracticesContributor(
    userId: string,
    options: {
        planScope: InstitutionalValuesBestPracticesScope;
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
            "Only active scoped leadership, IQAC, extension, or welfare users can be assigned this portfolio.",
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
            "The selected user is outside the department scope of this plan.",
            400
        );
    }

    if (
        options.planScope.institutionId &&
        facultyScope.institutionId &&
        options.planScope.institutionId !== facultyScope.institutionId
    ) {
        throw new AuthError(
            "The selected user is outside the institution scope of this plan.",
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
            .select("assignmentType")
            .lean(),
    ]);

    const hasCoordinatorRole = leadershipAssignments.some((assignment) =>
        institutionalValuesCoordinatorPattern.test(String(assignment.assignmentType ?? ""))
    );
    const hasScopedWorkflowRole =
        canViewModuleRecord(
            authorizationProfile,
            "INSTITUTIONAL_VALUES_BEST_PRACTICES",
            subjectScope
        ) &&
        authorizationProfile.workflowRoles.some((role) =>
            ["OFFICE_HEAD", "DEPARTMENT_HEAD", "DIRECTOR", "PRINCIPAL", "IQAC"].includes(role)
        );
    const hasCommitteeMembership =
        canViewModuleRecord(
            authorizationProfile,
            "INSTITUTIONAL_VALUES_BEST_PRACTICES",
            subjectScope
        ) &&
        committeeMemberships.some((membership) => {
            const committee = membership.committeeId as { committeeType?: string } | null;
            return ["IQAC", "NAAC_CELL", "GREEN_AUDIT_CELL", "EXTENSION_CELL"].includes(
                String(committee?.committeeType ?? "")
            );
        });

    if (
        !authorizationProfile.hasLeadershipPortalAccess ||
        !canViewModuleRecord(
            authorizationProfile,
            "INSTITUTIONAL_VALUES_BEST_PRACTICES",
            subjectScope
        ) ||
        (!hasCoordinatorRole && !hasScopedWorkflowRole && !hasCommitteeMembership)
    ) {
        throw new AuthError(
            "Only the plan owner or an active scoped IQAC, welfare, or leadership actor can be assigned to this portfolio.",
            400
        );
    }

    return user;
}

async function syncRowCollection(
    assignment: IInstitutionalValuesBestPracticesAssignment,
    rows: Array<Record<string, any>>,
    model: any,
    mapPayload: (row: Record<string, any>, index: number) => Record<string, any>
) {
    const existingRows = (await model.find({
        assignmentId: assignment._id,
    })) as any[];
    const existingById = new Map<string, any>(
        existingRows.map((row: any) => [row._id.toString(), row])
    );
    const keepIds = new Set<string>();

    for (const [index, row] of rows.entries()) {
        const payload = mapPayload(row, index);

        if (row._id && existingById.has(row._id)) {
            const existing = existingById.get(row._id)!;
            existing.set(payload);
            await existing.save();
            keepIds.add(existing._id.toString());
            continue;
        }

        const created = await model.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row: any) => row._id.toString())
        .filter((id: string) => !keepIds.has(id));

    if (staleIds.length) {
        await model.deleteMany({
            _id: { $in: toObjectIdList(staleIds) },
        });
    }

    return Array.from(keepIds);
}

async function hydrateAssignments(
    assignments: Array<Record<string, any>>,
    actor?: InstitutionalValuesBestPracticesActor
) {
    const planIds = uniqueStrings(assignments.map((row) => row.planId?.toString()));
    const assigneeIds = uniqueStrings(assignments.map((row) => row.assigneeUserId?.toString()));
    const assignmentIds = uniqueStrings(assignments.map((row) => row._id?.toString()));

    const [
        plans,
        assignees,
        greenCampusInitiatives,
        environmentalResourceRecords,
        energyConsumptionRecords,
        waterManagementSystems,
        wasteManagementPractices,
        genderEquityPrograms,
        inclusivenessFacilities,
        ethicsPrograms,
        codeOfConductRecords,
        communityOutreachPrograms,
        outreachParticipants,
        institutionalBestPractices,
        institutionalDistinctivenessEntries,
        sustainabilityAudits,
    ] = await Promise.all([
        planIds.length
            ? InstitutionalValuesBestPracticesPlan.find({ _id: { $in: toObjectIdList(planIds) } })
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
            ? GreenCampusInitiative.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? EnvironmentalResourceRecord.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? EnergyConsumptionRecord.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? WaterManagementSystem.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? WasteManagementPractice.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? GenderEquityProgram.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? InclusivenessFacility.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? EthicsProgram.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? CodeOfConductRecord.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? CommunityOutreachProgram.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? OutreachParticipant.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? InstitutionalBestPractice.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? InstitutionalDistinctiveness.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
        assignmentIds.length
            ? SustainabilityAudit.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, updatedAt: -1 })
                  .lean()
            : [],
    ]);

    const planById = new Map(plans.map((row) => [row._id.toString(), row]));
    const assigneeById = new Map(assignees.map((row) => [row._id.toString(), row]));

    const groupRows = (rows: Array<Record<string, any>>) => {
        const grouped = new Map<string, Array<Record<string, any>>>();
        for (const row of rows) {
            const key = row.assignmentId.toString();
            grouped.set(key, [...(grouped.get(key) ?? []), row]);
        }
        return grouped;
    };

    const greenCampusByAssignmentId = groupRows(greenCampusInitiatives);
    const environmentalResourcesByAssignmentId = groupRows(environmentalResourceRecords);
    const energyRecordsByAssignmentId = groupRows(energyConsumptionRecords);
    const waterSystemsByAssignmentId = groupRows(waterManagementSystems);
    const wastePracticesByAssignmentId = groupRows(wasteManagementPractices);
    const genderProgramsByAssignmentId = groupRows(genderEquityPrograms);
    const inclusivenessFacilitiesByAssignmentId = groupRows(inclusivenessFacilities);
    const ethicsProgramsByAssignmentId = groupRows(ethicsPrograms);
    const codeOfConductByAssignmentId = groupRows(codeOfConductRecords);
    const outreachProgramsByAssignmentId = groupRows(communityOutreachPrograms);
    const outreachParticipantsByAssignmentId = groupRows(outreachParticipants);
    const bestPracticesByAssignmentId = groupRows(institutionalBestPractices);
    const distinctivenessByAssignmentId = groupRows(institutionalDistinctivenessEntries);
    const auditsByAssignmentId = groupRows(sustainabilityAudits);

    const rowDocumentIds = uniqueStrings([
        ...greenCampusInitiatives.map((row) => row.documentId?.toString()),
        ...environmentalResourceRecords.map((row) => row.documentId?.toString()),
        ...energyConsumptionRecords.map((row) => row.documentId?.toString()),
        ...waterManagementSystems.map((row) => row.documentId?.toString()),
        ...wasteManagementPractices.map((row) => row.documentId?.toString()),
        ...genderEquityPrograms.map((row) => row.documentId?.toString()),
        ...inclusivenessFacilities.map((row) => row.documentId?.toString()),
        ...ethicsPrograms.map((row) => row.documentId?.toString()),
        ...codeOfConductRecords.map((row) => row.policyDocumentId?.toString()),
        ...communityOutreachPrograms.map((row) => row.documentId?.toString()),
        ...outreachParticipants.map((row) => row.certificateDocumentId?.toString()),
        ...institutionalBestPractices.map((row) => row.documentId?.toString()),
        ...institutionalDistinctivenessEntries.map((row) => row.documentId?.toString()),
        ...sustainabilityAudits.map((row) => row.documentId?.toString()),
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

    const workflowDefinition = await getActiveWorkflowDefinition("INSTITUTIONAL_VALUES_BEST_PRACTICES");
    const profile = actor ? await resolveAuthorizationProfile(actor) : null;

    return Promise.all(
        assignments.map(async (assignment) => {
            const plan = planById.get(assignment.planId.toString());
            if (!plan) {
                throw new AuthError(
                    "Institutional values assignment references a missing plan.",
                    400
                );
            }

            const assignee = assigneeById.get(assignment.assigneeUserId.toString());

            const mapSectionRows = <T extends Record<string, any>>(rows: T[]) =>
                rows.map((row) => ({
                    id: row._id.toString(),
                    documentId: row.documentId?.toString(),
                    document: row.documentId ? documentById.get(row.documentId.toString()) : undefined,
                    ...row,
                }));

            const greenCampusRows = mapSectionRows(
                greenCampusByAssignmentId.get(assignment._id.toString()) ?? []
            );
            const environmentalResourceRows = mapSectionRows(
                environmentalResourcesByAssignmentId.get(assignment._id.toString()) ?? []
            );
            const energyRecordRows = mapSectionRows(
                energyRecordsByAssignmentId.get(assignment._id.toString()) ?? []
            );
            const waterSystemRows = mapSectionRows(
                waterSystemsByAssignmentId.get(assignment._id.toString()) ?? []
            );
            const wastePracticeRows = mapSectionRows(
                wastePracticesByAssignmentId.get(assignment._id.toString()) ?? []
            );
            const genderProgramRows = mapSectionRows(
                genderProgramsByAssignmentId.get(assignment._id.toString()) ?? []
            );
            const inclusivenessFacilityRows = mapSectionRows(
                inclusivenessFacilitiesByAssignmentId.get(assignment._id.toString()) ?? []
            );
            const ethicsProgramRows = mapSectionRows(
                ethicsProgramsByAssignmentId.get(assignment._id.toString()) ?? []
            );
            const codeOfConductRows =
                (codeOfConductByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                    id: row._id.toString(),
                    policyDocumentId: row.policyDocumentId?.toString(),
                    document: row.policyDocumentId
                        ? documentById.get(row.policyDocumentId.toString())
                        : undefined,
                    ...row,
                }));
            const outreachProgramRows = mapSectionRows(
                outreachProgramsByAssignmentId.get(assignment._id.toString()) ?? []
            );
            const outreachProgramTitleById = new Map(
                outreachProgramRows.map((row: any) => [row.id, row.title])
            );
            const outreachProgramDisplayOrderById = new Map(
                outreachProgramRows.map((row: any) => [row.id, row.displayOrder])
            );
            const outreachParticipantRows =
                (outreachParticipantsByAssignmentId.get(assignment._id.toString()) ?? []).map((row) => ({
                    id: row._id.toString(),
                    programId: row.programId?.toString(),
                    programTitle: row.programId
                        ? outreachProgramTitleById.get(row.programId.toString())
                        : undefined,
                    programDisplayOrder: row.programId
                        ? outreachProgramDisplayOrderById.get(row.programId.toString())
                        : undefined,
                    certificateDocumentId: row.certificateDocumentId?.toString(),
                    certificateDocument: row.certificateDocumentId
                        ? documentById.get(row.certificateDocumentId.toString())
                        : undefined,
                    ...row,
                }));
            const bestPracticeRows = mapSectionRows(
                bestPracticesByAssignmentId.get(assignment._id.toString()) ?? []
            );
            const distinctivenessRows = mapSectionRows(
                distinctivenessByAssignmentId.get(assignment._id.toString()) ?? []
            );
            const auditRows = mapSectionRows(
                auditsByAssignmentId.get(assignment._id.toString()) ?? []
            );

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
                      ? canViewModuleRecord(profile, "INSTITUTIONAL_VALUES_BEST_PRACTICES", {
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
                          moduleName: "INSTITUTIONAL_VALUES_BEST_PRACTICES",
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

            const normalizedEnergyRows = [
                ...environmentalResourceRows
                    .filter((row: any) => row.resourceCategory === "EnergyConsumption")
                    .map((row: any) => ({
                        id: `legacy-energy-${row.id}`,
                        energySource: row.resourceType || "Electricity",
                        academicYearId: undefined,
                        unitsConsumed: row.unitsConsumed,
                        costIncurred: row.costIncurred,
                        recordedMonth: row.recordedMonth,
                        documentId: row.documentId,
                        document: row.document,
                    })),
                ...energyRecordRows.map((row: any) => ({
                    id: row.id,
                    energySource: row.energySource,
                    academicYearId: row.academicYearId?.toString(),
                    unitsConsumed: row.unitsConsumed,
                    costIncurred: row.costIncurred,
                    recordedMonth: row.recordedMonth,
                    documentId: row.documentId,
                    document: row.document,
                })),
            ];

            const normalizedWaterRows = [
                ...environmentalResourceRows
                    .filter((row: any) => row.resourceCategory === "WaterManagement")
                    .map((row: any) => ({
                        id: `legacy-water-${row.id}`,
                        systemType: row.resourceType || "Other",
                        installationYear: row.installationYear,
                        capacityLiters: row.capacityLiters,
                        status: row.status,
                        methodology: row.methodology,
                        documentId: row.documentId,
                        document: row.document,
                    })),
                ...waterSystemRows.map((row: any) => ({
                    id: row.id,
                    systemType: row.systemType,
                    installationYear: row.installationYear,
                    capacityLiters: row.capacityLiters,
                    status: row.status,
                    methodology: row.methodology,
                    documentId: row.documentId,
                    document: row.document,
                })),
            ];

            const normalizedWasteRows = [
                ...environmentalResourceRows
                    .filter((row: any) => row.resourceCategory === "WasteManagement")
                    .map((row: any) => ({
                        id: `legacy-waste-${row.id}`,
                        practiceType: row.resourceType || "Other",
                        methodology: row.methodology,
                        implementedDate: undefined,
                        impactSummary: undefined,
                        documentId: row.documentId,
                        document: row.document,
                    })),
                ...wastePracticeRows.map((row: any) => ({
                    id: row.id,
                    practiceType: row.practiceType,
                    methodology: row.methodology,
                    implementedDate: row.implementedDate,
                    impactSummary: row.impactSummary,
                    documentId: row.documentId,
                    document: row.document,
                })),
            ];

            const normalizedEthicsRows = ethicsProgramRows.filter(
                (row: any) => row.recordType !== "CodeOfConduct"
            );

            const normalizedCodeOfConductRows = [
                ...ethicsProgramRows
                    .filter((row: any) => row.recordType === "CodeOfConduct")
                    .map((row: any) => ({
                        id: `legacy-code-${row.id}`,
                        title: row.title,
                        stakeholderType: row.stakeholderType,
                        effectiveDate: row.effectiveDate,
                        reviewCycleYears: row.reviewCycleYears,
                        status: row.status,
                        policyDocumentId: row.documentId,
                        document: row.document,
                    })),
                ...codeOfConductRows.map((row: any) => ({
                    id: row.id,
                    title: row.title,
                    stakeholderType: row.stakeholderType,
                    effectiveDate: row.effectiveDate,
                    reviewCycleYears: row.reviewCycleYears,
                    status: row.status,
                    policyDocumentId: row.policyDocumentId,
                    document: row.document,
                })),
            ];

            const valueSummary = createValueSummary({
                narratives: {
                    environmentalSustainabilityNarrative:
                        assignment.environmentalSustainabilityNarrative,
                    inclusivenessNarrative: assignment.inclusivenessNarrative,
                    humanValuesNarrative: assignment.humanValuesNarrative,
                    communityOutreachNarrative: assignment.communityOutreachNarrative,
                    bestPracticesNarrative: assignment.bestPracticesNarrative,
                    institutionalDistinctivenessNarrative:
                        assignment.institutionalDistinctivenessNarrative,
                    sustainabilityAuditNarrative: assignment.sustainabilityAuditNarrative,
                    actionPlan: assignment.actionPlan,
                },
                sectionCount:
                    greenCampusRows.length +
                    normalizedEnergyRows.length +
                    normalizedWaterRows.length +
                    normalizedWasteRows.length +
                    genderProgramRows.length +
                    inclusivenessFacilityRows.length +
                    normalizedEthicsRows.length +
                    normalizedCodeOfConductRows.length +
                    outreachProgramRows.length +
                    outreachParticipantRows.length +
                    bestPracticeRows.length +
                    distinctivenessRows.length +
                    auditRows.length,
                evidenceFiles:
                    manualDocuments.length +
                    [
                        ...greenCampusRows,
                        ...normalizedEnergyRows,
                        ...normalizedWaterRows,
                        ...normalizedWasteRows,
                        ...genderProgramRows,
                        ...inclusivenessFacilityRows,
                        ...normalizedEthicsRows,
                        ...normalizedCodeOfConductRows.map((row) => ({
                            documentId: row.policyDocumentId,
                        })),
                        ...outreachProgramRows,
                        ...outreachParticipantRows.map((row) => ({
                            documentId: row.certificateDocumentId,
                        })),
                        ...bestPracticeRows,
                        ...distinctivenessRows,
                        ...auditRows,
                    ].filter((row) => Boolean(row.documentId)).length,
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
                theme: plan.theme,
                unitLabel:
                    plan.scopeType === "Department"
                        ? departmentRef?.name ?? assignment.scopeDepartmentName ?? "Department"
                        : institutionRef?.name ?? assignment.scopeCollegeName ?? "Institution",
                planStatus: plan.status,
                planOverview: plan.overview,
                planStrategicPriorities: plan.strategicPriorities,
                planTargets: {
                    environmentalRecords: plan.targetEnvironmentalRecords ?? 0,
                    inclusionRecords: plan.targetInclusionRecords ?? 0,
                    ethicsRecords: plan.targetEthicsRecords ?? 0,
                    outreachPrograms: plan.targetOutreachPrograms ?? 0,
                    bestPractices: plan.targetBestPractices ?? 0,
                    distinctivenessNarratives: plan.targetDistinctivenessNarratives ?? 0,
                    audits: plan.targetAuditCount ?? 0,
                },
                assigneeName: assignee?.name ?? "",
                assigneeEmail: assignee?.email ?? "",
                assigneeRole: assignee?.role ?? assignment.assigneeRole,
                status: assignment.status,
                dueDate: assignment.dueDate,
                notes: assignment.notes,
                environmentalSustainabilityNarrative:
                    assignment.environmentalSustainabilityNarrative,
                inclusivenessNarrative: assignment.inclusivenessNarrative,
                humanValuesNarrative: assignment.humanValuesNarrative,
                communityOutreachNarrative: assignment.communityOutreachNarrative,
                bestPracticesNarrative: assignment.bestPracticesNarrative,
                institutionalDistinctivenessNarrative:
                    assignment.institutionalDistinctivenessNarrative,
                sustainabilityAuditNarrative: assignment.sustainabilityAuditNarrative,
                actionPlan: assignment.actionPlan,
                supportingLinks: assignment.supportingLinks ?? [],
                documentIds:
                    assignment.documentIds?.map((value: Types.ObjectId) => value.toString()) ?? [],
                documents: manualDocuments,
                contributorRemarks: assignment.contributorRemarks,
                reviewRemarks: assignment.reviewRemarks,
                greenCampusInitiatives: greenCampusRows.map((row: any) => ({
                    id: row.id,
                    initiativeType: row.initiativeType,
                    title: row.title,
                    startDate: row.startDate,
                    endDate: row.endDate,
                    status: row.status,
                    impactDescription: row.impactDescription,
                    documentId: row.documentId,
                    document: row.document,
                })),
                environmentalResourceRecords: environmentalResourceRows.map((row: any) => ({
                    id: row.id,
                    resourceCategory: row.resourceCategory,
                    resourceType: row.resourceType,
                    recordedMonth: row.recordedMonth,
                    unitsConsumed: row.unitsConsumed,
                    costIncurred: row.costIncurred,
                    installationYear: row.installationYear,
                    capacityLiters: row.capacityLiters,
                    methodology: row.methodology,
                    status: row.status,
                    documentId: row.documentId,
                    document: row.document,
                })),
                energyConsumptionRecords: normalizedEnergyRows,
                waterManagementSystems: normalizedWaterRows,
                wasteManagementPractices: normalizedWasteRows,
                genderEquityPrograms: genderProgramRows.map((row: any) => ({
                    id: row.id,
                    programType: row.programType,
                    title: row.title,
                    conductedDate: row.conductedDate,
                    participantsCount: row.participantsCount,
                    impactNotes: row.impactNotes,
                    documentId: row.documentId,
                    document: row.document,
                })),
                inclusivenessFacilities: inclusivenessFacilityRows.map((row: any) => ({
                    id: row.id,
                    facilityType: row.facilityType,
                    locationDescription: row.locationDescription,
                    establishedYear: row.establishedYear,
                    status: row.status,
                    documentId: row.documentId,
                    document: row.document,
                })),
                ethicsPrograms: normalizedEthicsRows.map((row: any) => ({
                    id: row.id,
                    title: row.title,
                    programCategory: row.programCategory,
                    programDate: row.programDate,
                    targetAudience: row.targetAudience,
                    stakeholderType: row.stakeholderType,
                    status: row.status,
                    documentId: row.documentId,
                    document: row.document,
                })),
                codeOfConductRecords: normalizedCodeOfConductRows,
                communityOutreachPrograms: outreachProgramRows.map((row: any) => ({
                    id: row.id,
                    activityType: row.activityType,
                    title: row.title,
                    location: row.location,
                    startDate: row.startDate,
                    endDate: row.endDate,
                    beneficiariesCount: row.beneficiariesCount,
                    impactSummary: row.impactSummary,
                    documentId: row.documentId,
                    document: row.document,
                })),
                outreachParticipants: outreachParticipantRows.map((row: any) => ({
                    id: row.id,
                    programId: row.programId,
                    programTitle: row.programTitle,
                    programDisplayOrder: row.programDisplayOrder,
                    participantType: row.participantType,
                    participantId: row.participantId,
                    participantName: row.participantName,
                    hoursContributed: row.hoursContributed,
                    certificateDocumentId: row.certificateDocumentId,
                    certificateDocument: row.certificateDocument,
                })),
                institutionalBestPractices: bestPracticeRows.map((row: any) => ({
                    id: row.id,
                    practiceTitle: row.practiceTitle,
                    objectives: row.objectives,
                    context: row.context,
                    implementationDetails: row.implementationDetails,
                    evidenceOfSuccess: row.evidenceOfSuccess,
                    problemsEncountered: row.problemsEncountered,
                    resourcesRequired: row.resourcesRequired,
                    documentId: row.documentId,
                    document: row.document,
                })),
                institutionalDistinctivenessEntries: distinctivenessRows.map((row: any) => ({
                    id: row.id,
                    distinctFeatureTitle: row.distinctFeatureTitle,
                    description: row.description,
                    impactOnStudents: row.impactOnStudents,
                    societalImpact: row.societalImpact,
                    documentId: row.documentId,
                    document: row.document,
                })),
                sustainabilityAudits: auditRows.map((row: any) => ({
                    id: row.id,
                    auditType: row.auditType,
                    auditAgency: row.auditAgency,
                    auditYear: row.auditYear,
                    auditScore: row.auditScore,
                    recommendations: row.recommendations,
                    documentId: row.documentId,
                    document: row.document,
                })),
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
    if (!record.environmentalSustainabilityNarrative?.trim()) {
        throw new AuthError("Environmental sustainability narrative is required before submission.", 400);
    }

    if (!record.inclusivenessNarrative?.trim()) {
        throw new AuthError("Inclusiveness narrative is required before submission.", 400);
    }

    if (!record.humanValuesNarrative?.trim()) {
        throw new AuthError("Human values and ethics narrative is required before submission.", 400);
    }

    if (!record.communityOutreachNarrative?.trim()) {
        throw new AuthError("Community outreach narrative is required before submission.", 400);
    }

    if (!record.bestPracticesNarrative?.trim()) {
        throw new AuthError("Best practices narrative is required before submission.", 400);
    }

    if (!record.institutionalDistinctivenessNarrative?.trim()) {
        throw new AuthError("Institutional distinctiveness narrative is required before submission.", 400);
    }

    if (!record.sustainabilityAuditNarrative?.trim()) {
        throw new AuthError("Sustainability audit narrative is required before submission.", 400);
    }

    const structuredRowCount =
        record.greenCampusInitiatives.length +
        record.environmentalResourceRecords.length +
        record.energyConsumptionRecords.length +
        record.waterManagementSystems.length +
        record.wasteManagementPractices.length +
        record.genderEquityPrograms.length +
        record.inclusivenessFacilities.length +
        record.ethicsPrograms.length +
        record.codeOfConductRecords.length +
        record.communityOutreachPrograms.length +
        record.outreachParticipants.length +
        record.institutionalBestPractices.length +
        record.institutionalDistinctivenessEntries.length +
        record.sustainabilityAudits.length;

    if (!structuredRowCount) {
        throw new AuthError(
            "Add at least one structured Criteria 7 record before submission.",
            400
        );
    }

    const evidenceCount =
        record.documents.length +
        [
            ...record.greenCampusInitiatives,
            ...record.environmentalResourceRecords,
            ...record.energyConsumptionRecords,
            ...record.waterManagementSystems,
            ...record.wasteManagementPractices,
            ...record.genderEquityPrograms,
            ...record.inclusivenessFacilities,
            ...record.ethicsPrograms,
            ...record.codeOfConductRecords.map((row) => ({
                documentId: row.policyDocumentId,
            })),
            ...record.communityOutreachPrograms,
            ...record.outreachParticipants.map((row) => ({
                documentId: row.certificateDocumentId,
            })),
            ...record.institutionalBestPractices,
            ...record.institutionalDistinctivenessEntries,
            ...record.sustainabilityAudits,
        ].filter((row) => Boolean(row.documentId)).length +
        record.supportingLinks.length;

    if (!evidenceCount) {
        throw new AuthError(
            "Attach at least one evidence file or supporting link before submission.",
            400
        );
    }
}

export async function getInstitutionalValuesBestPracticesAdminConsole() {
    await dbConnect();

    const [plans, assignments, academicYears, departments, institutions, users] =
        await Promise.all([
            InstitutionalValuesBestPracticesPlan.find({})
                .populate("academicYearId", "yearStart yearEnd")
                .populate("institutionId", "name")
                .populate("departmentId", "name")
                .sort({ updatedAt: -1 })
                .lean(),
            InstitutionalValuesBestPracticesAssignment.find({})
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
                theme: plan.theme,
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
                overview: plan.overview,
                strategicPriorities: plan.strategicPriorities,
                targetEnvironmentalRecords: plan.targetEnvironmentalRecords ?? 0,
                targetInclusionRecords: plan.targetInclusionRecords ?? 0,
                targetEthicsRecords: plan.targetEthicsRecords ?? 0,
                targetOutreachPrograms: plan.targetOutreachPrograms ?? 0,
                targetBestPractices: plan.targetBestPractices ?? 0,
                targetDistinctivenessNarratives: plan.targetDistinctivenessNarratives ?? 0,
                targetAuditCount: plan.targetAuditCount ?? 0,
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

export async function createInstitutionalValuesBestPracticesPlan(
    actor: InstitutionalValuesBestPracticesActor,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = institutionalValuesBestPracticesPlanSchema.parse(rawInput);
    const { scope } = await resolvePlanContext({
        academicYearId: input.academicYearId,
        scopeType: input.scopeType,
        institutionId: input.institutionId,
        departmentId: input.departmentId,
    });

    if (input.ownerUserId) {
        await ensureEligibleInstitutionalValuesBestPracticesContributor(input.ownerUserId, {
            planScope: scope,
        });
    }

    const plan = await InstitutionalValuesBestPracticesPlan.create({
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
        theme: input.theme,
        overview: input.overview || undefined,
        strategicPriorities: input.strategicPriorities || undefined,
        targetEnvironmentalRecords: input.targetEnvironmentalRecords,
        targetInclusionRecords: input.targetInclusionRecords,
        targetEthicsRecords: input.targetEthicsRecords,
        targetOutreachPrograms: input.targetOutreachPrograms,
        targetBestPractices: input.targetBestPractices,
        targetDistinctivenessNarratives: input.targetDistinctivenessNarratives,
        targetAuditCount: input.targetAuditCount,
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
        "institutional_values_best_practices_plans",
        plan._id.toString(),
        undefined,
        plan.toObject()
    );

    return plan;
}

export async function updateInstitutionalValuesBestPracticesPlan(
    actor: InstitutionalValuesBestPracticesActor,
    planId: string,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = institutionalValuesBestPracticesPlanUpdateSchema.parse(rawInput);
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
        await ensureEligibleInstitutionalValuesBestPracticesContributor(input.ownerUserId, {
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
    if (input.theme !== undefined) plan.theme = input.theme;
    if (input.overview !== undefined) plan.overview = input.overview || undefined;
    if (input.strategicPriorities !== undefined) {
        plan.strategicPriorities = input.strategicPriorities || undefined;
    }
    if (input.targetEnvironmentalRecords !== undefined) {
        plan.targetEnvironmentalRecords = input.targetEnvironmentalRecords;
    }
    if (input.targetInclusionRecords !== undefined) {
        plan.targetInclusionRecords = input.targetInclusionRecords;
    }
    if (input.targetEthicsRecords !== undefined) {
        plan.targetEthicsRecords = input.targetEthicsRecords;
    }
    if (input.targetOutreachPrograms !== undefined) {
        plan.targetOutreachPrograms = input.targetOutreachPrograms;
    }
    if (input.targetBestPractices !== undefined) {
        plan.targetBestPractices = input.targetBestPractices;
    }
    if (input.targetDistinctivenessNarratives !== undefined) {
        plan.targetDistinctivenessNarratives = input.targetDistinctivenessNarratives;
    }
    if (input.targetAuditCount !== undefined) {
        plan.targetAuditCount = input.targetAuditCount;
    }
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
        "institutional_values_best_practices_plans",
        plan._id.toString(),
        oldData,
        plan.toObject()
    );

    return plan;
}

export async function createInstitutionalValuesBestPracticesAssignment(
    actor: InstitutionalValuesBestPracticesActor,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = institutionalValuesBestPracticesAssignmentSchema.parse(rawInput);
    const { plan, scope } = await loadPlanCore(input.planId);
    const assignee = await ensureEligibleInstitutionalValuesBestPracticesContributor(
        input.assigneeUserId,
        {
            planScope: scope,
            planOwnerUserId: plan.ownerUserId?.toString(),
        }
    );

    const assignment = await InstitutionalValuesBestPracticesAssignment.create({
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
        moduleName: "INSTITUTIONAL_VALUES_BEST_PRACTICES",
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
        "institutional_values_best_practices_assignments",
        assignment._id.toString(),
        undefined,
        assignment.toObject()
    );

    return assignment;
}

export async function updateInstitutionalValuesBestPracticesAssignment(
    actor: InstitutionalValuesBestPracticesActor,
    assignmentId: string,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = institutionalValuesBestPracticesAssignmentUpdateSchema.parse(rawInput);
    const { assignment, plan, scope } = await loadAssignmentCore(assignmentId);
    const oldData = assignment.toObject();

    const hasContributionData =
        assignment.environmentalSustainabilityNarrative?.trim() ||
        assignment.inclusivenessNarrative?.trim() ||
        assignment.humanValuesNarrative?.trim() ||
        assignment.communityOutreachNarrative?.trim() ||
        assignment.bestPracticesNarrative?.trim() ||
        assignment.institutionalDistinctivenessNarrative?.trim() ||
        assignment.sustainabilityAuditNarrative?.trim() ||
        assignment.actionPlan?.trim() ||
        assignment.supportingLinks.length ||
        assignment.documentIds.length ||
        assignment.greenCampusInitiativeIds.length ||
        assignment.environmentalResourceRecordIds.length ||
        assignment.genderEquityProgramIds.length ||
        assignment.inclusivenessFacilityIds.length ||
        assignment.ethicsProgramIds.length ||
        assignment.communityOutreachProgramIds.length ||
        assignment.institutionalBestPracticeIds.length ||
        assignment.institutionalDistinctivenessIds.length ||
        assignment.sustainabilityAuditIds.length ||
        assignment.contributorRemarks?.trim();

    if (
        input.assigneeUserId &&
        hasContributionData &&
        input.assigneeUserId !== assignment.assigneeUserId.toString()
    ) {
        throw new AuthError(
            "Assignee remapping is blocked once Criteria 7 contribution data exists.",
            409
        );
    }

    if (input.assigneeUserId) {
        const assignee = await ensureEligibleInstitutionalValuesBestPracticesContributor(
            input.assigneeUserId,
            {
                planScope: scope,
                planOwnerUserId: plan.ownerUserId?.toString(),
            }
        );
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
        "institutional_values_best_practices_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function saveInstitutionalValuesBestPracticesContributionDraft(
    actor: InstitutionalValuesBestPracticesActor,
    assignmentId: string,
    rawInput: unknown
) {
    await dbConnect();

    const input = institutionalValuesBestPracticesContributionDraftSchema.parse(rawInput);
    const { assignment, plan } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() !== actor.id) {
        throw new AuthError("This Criteria 7 assignment is not mapped to your account.", 403);
    }

    if (!assignment.isActive) {
        throw new AuthError("This Criteria 7 assignment is inactive.", 409);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or returned assignments can be edited.", 409);
    }

    if (plan.status === "Locked") {
        throw new AuthError("Locked plans cannot be edited.", 409);
    }

    const oldData = assignment.toObject();
    const [
        greenCampusInitiativeIds,
        environmentalResourceRecordIds,
        energyConsumptionRecordIds,
        waterManagementSystemIds,
        wasteManagementPracticeIds,
        genderEquityProgramIds,
        inclusivenessFacilityIds,
        ethicsProgramIds,
        codeOfConductRecordIds,
        communityOutreachProgramIds,
        institutionalBestPracticeIds,
        institutionalDistinctivenessIds,
        sustainabilityAuditIds,
    ] = await Promise.all([
        syncRowCollection(
            assignment,
            input.greenCampusInitiatives,
            GreenCampusInitiative,
            (row, index) => ({
                planId: assignment.planId,
                assignmentId: assignment._id,
                initiativeType: row.initiativeType,
                title: row.title,
                startDate: toOptionalDate(row.startDate),
                endDate: toOptionalDate(row.endDate),
                status: row.status,
                impactDescription: row.impactDescription || undefined,
                documentId: row.documentId
                    ? ensureObjectId(row.documentId, "Green campus document is invalid.")
                    : undefined,
                displayOrder: row.displayOrder ?? index + 1,
            })
        ),
        syncRowCollection(
            assignment,
            input.environmentalResourceRecords,
            EnvironmentalResourceRecord,
            (row, index) => ({
                planId: assignment.planId,
                assignmentId: assignment._id,
                resourceCategory: row.resourceCategory,
                resourceType: row.resourceType || undefined,
                recordedMonth: row.recordedMonth || undefined,
                unitsConsumed: toOptionalNumber(row.unitsConsumed),
                costIncurred: toOptionalNumber(row.costIncurred),
                installationYear: toOptionalNumber(row.installationYear),
                capacityLiters: toOptionalNumber(row.capacityLiters),
                methodology: row.methodology || undefined,
                status: row.status,
                documentId: row.documentId
                    ? ensureObjectId(row.documentId, "Environmental resource document is invalid.")
                    : undefined,
                displayOrder: row.displayOrder ?? index + 1,
            })
        ),
        syncRowCollection(
            assignment,
            input.energyConsumptionRecords,
            EnergyConsumptionRecord,
            (row, index) => ({
                planId: assignment.planId,
                assignmentId: assignment._id,
                energySource: row.energySource,
                academicYearId: row.academicYearId
                    ? ensureObjectId(row.academicYearId, "Energy academic year is invalid.")
                    : undefined,
                unitsConsumed: toOptionalNumber(row.unitsConsumed),
                costIncurred: toOptionalNumber(row.costIncurred),
                recordedMonth: row.recordedMonth || undefined,
                documentId: row.documentId
                    ? ensureObjectId(row.documentId, "Energy record document is invalid.")
                    : undefined,
                displayOrder: row.displayOrder ?? index + 1,
            })
        ),
        syncRowCollection(
            assignment,
            input.waterManagementSystems,
            WaterManagementSystem,
            (row, index) => ({
                planId: assignment.planId,
                assignmentId: assignment._id,
                systemType: row.systemType,
                installationYear: toOptionalNumber(row.installationYear),
                capacityLiters: toOptionalNumber(row.capacityLiters),
                status: row.status,
                methodology: row.methodology || undefined,
                documentId: row.documentId
                    ? ensureObjectId(row.documentId, "Water management document is invalid.")
                    : undefined,
                displayOrder: row.displayOrder ?? index + 1,
            })
        ),
        syncRowCollection(
            assignment,
            input.wasteManagementPractices,
            WasteManagementPractice,
            (row, index) => ({
                planId: assignment.planId,
                assignmentId: assignment._id,
                practiceType: row.practiceType,
                methodology: row.methodology || undefined,
                implementedDate: toOptionalDate(row.implementedDate),
                impactSummary: row.impactSummary || undefined,
                documentId: row.documentId
                    ? ensureObjectId(row.documentId, "Waste management document is invalid.")
                    : undefined,
                displayOrder: row.displayOrder ?? index + 1,
            })
        ),
        syncRowCollection(
            assignment,
            input.genderEquityPrograms,
            GenderEquityProgram,
            (row, index) => ({
                planId: assignment.planId,
                assignmentId: assignment._id,
                programType: row.programType,
                title: row.title,
                conductedDate: toOptionalDate(row.conductedDate),
                participantsCount: toOptionalNumber(row.participantsCount),
                impactNotes: row.impactNotes || undefined,
                documentId: row.documentId
                    ? ensureObjectId(row.documentId, "Gender equity document is invalid.")
                    : undefined,
                displayOrder: row.displayOrder ?? index + 1,
            })
        ),
        syncRowCollection(
            assignment,
            input.inclusivenessFacilities,
            InclusivenessFacility,
            (row, index) => ({
                planId: assignment.planId,
                assignmentId: assignment._id,
                facilityType: row.facilityType,
                locationDescription: row.locationDescription || undefined,
                establishedYear: toOptionalNumber(row.establishedYear),
                status: row.status,
                documentId: row.documentId
                    ? ensureObjectId(row.documentId, "Inclusiveness facility document is invalid.")
                    : undefined,
                displayOrder: row.displayOrder ?? index + 1,
            })
        ),
        syncRowCollection(
            assignment,
            input.ethicsPrograms,
            EthicsProgram,
            (row, index) => ({
                planId: assignment.planId,
                assignmentId: assignment._id,
                title: row.title,
                programCategory: row.programCategory,
                programDate: toOptionalDate(row.programDate),
                targetAudience: row.targetAudience || undefined,
                stakeholderType: row.stakeholderType,
                status: row.status,
                documentId: row.documentId
                    ? ensureObjectId(row.documentId, "Ethics record document is invalid.")
                    : undefined,
                displayOrder: row.displayOrder ?? index + 1,
            })
        ),
        syncRowCollection(
            assignment,
            input.codeOfConductRecords,
            CodeOfConductRecord,
            (row, index) => ({
                planId: assignment.planId,
                assignmentId: assignment._id,
                title: row.title,
                stakeholderType: row.stakeholderType,
                effectiveDate: toOptionalDate(row.effectiveDate),
                reviewCycleYears: toOptionalNumber(row.reviewCycleYears),
                status: row.status,
                policyDocumentId: row.policyDocumentId
                    ? ensureObjectId(row.policyDocumentId, "Code-of-conduct document is invalid.")
                    : undefined,
                displayOrder: row.displayOrder ?? index + 1,
            })
        ),
        syncRowCollection(
            assignment,
            input.communityOutreachPrograms,
            CommunityOutreachProgram,
            (row, index) => ({
                planId: assignment.planId,
                assignmentId: assignment._id,
                activityType: row.activityType,
                title: row.title,
                location: row.location || undefined,
                startDate: toOptionalDate(row.startDate),
                endDate: toOptionalDate(row.endDate),
                beneficiariesCount: toOptionalNumber(row.beneficiariesCount),
                impactSummary: row.impactSummary || undefined,
                documentId: row.documentId
                    ? ensureObjectId(row.documentId, "Outreach document is invalid.")
                    : undefined,
                displayOrder: row.displayOrder ?? index + 1,
            })
        ),
        syncRowCollection(
            assignment,
            input.institutionalBestPractices,
            InstitutionalBestPractice,
            (row, index) => ({
                planId: assignment.planId,
                assignmentId: assignment._id,
                practiceTitle: row.practiceTitle,
                objectives: row.objectives || undefined,
                context: row.context || undefined,
                implementationDetails: row.implementationDetails || undefined,
                evidenceOfSuccess: row.evidenceOfSuccess || undefined,
                problemsEncountered: row.problemsEncountered || undefined,
                resourcesRequired: row.resourcesRequired || undefined,
                documentId: row.documentId
                    ? ensureObjectId(row.documentId, "Best practice document is invalid.")
                    : undefined,
                displayOrder: row.displayOrder ?? index + 1,
            })
        ),
        syncRowCollection(
            assignment,
            input.institutionalDistinctivenessEntries,
            InstitutionalDistinctiveness,
            (row, index) => ({
                planId: assignment.planId,
                assignmentId: assignment._id,
                distinctFeatureTitle: row.distinctFeatureTitle,
                description: row.description || undefined,
                impactOnStudents: row.impactOnStudents || undefined,
                societalImpact: row.societalImpact || undefined,
                documentId: row.documentId
                    ? ensureObjectId(row.documentId, "Distinctiveness document is invalid.")
                    : undefined,
                displayOrder: row.displayOrder ?? index + 1,
            })
        ),
        syncRowCollection(
            assignment,
            input.sustainabilityAudits,
            SustainabilityAudit,
            (row, index) => ({
                planId: assignment.planId,
                assignmentId: assignment._id,
                auditType: row.auditType,
                auditAgency: row.auditAgency || undefined,
                auditYear: toOptionalNumber(row.auditYear),
                auditScore: toOptionalNumber(row.auditScore),
                recommendations: row.recommendations || undefined,
                documentId: row.documentId
                    ? ensureObjectId(row.documentId, "Audit document is invalid.")
                    : undefined,
                displayOrder: row.displayOrder ?? index + 1,
            })
        ),
    ]);

    const outreachParticipantIds = await syncRowCollection(
        assignment,
        input.outreachParticipants.map((row) => {
            let resolvedProgramId = row.programId;
            if (!resolvedProgramId && row.programDisplayOrder) {
                resolvedProgramId =
                    communityOutreachProgramIds[row.programDisplayOrder - 1];
            }
            return {
                ...row,
                programId: resolvedProgramId,
            };
        }),
        OutreachParticipant,
        (row, index) => {
            if (!row.programId) {
                throw new AuthError(
                    "Each outreach participant must be mapped to an outreach program.",
                    400
                );
            }

            return {
                planId: assignment.planId,
                assignmentId: assignment._id,
                programId: ensureObjectId(row.programId, "Outreach participant program is invalid."),
                participantType: row.participantType,
                participantId: row.participantId || undefined,
                participantName: row.participantName || undefined,
                hoursContributed: toOptionalNumber(row.hoursContributed),
                certificateDocumentId: row.certificateDocumentId
                    ? ensureObjectId(
                          row.certificateDocumentId,
                          "Outreach participant certificate is invalid."
                      )
                    : undefined,
                displayOrder: row.displayOrder ?? index + 1,
            };
        }
    );

    assignment.environmentalSustainabilityNarrative =
        input.environmentalSustainabilityNarrative || undefined;
    assignment.inclusivenessNarrative = input.inclusivenessNarrative || undefined;
    assignment.humanValuesNarrative = input.humanValuesNarrative || undefined;
    assignment.communityOutreachNarrative = input.communityOutreachNarrative || undefined;
    assignment.bestPracticesNarrative = input.bestPracticesNarrative || undefined;
    assignment.institutionalDistinctivenessNarrative =
        input.institutionalDistinctivenessNarrative || undefined;
    assignment.sustainabilityAuditNarrative = input.sustainabilityAuditNarrative || undefined;
    assignment.actionPlan = input.actionPlan || undefined;
    assignment.greenCampusInitiativeIds = toObjectIdList(greenCampusInitiativeIds);
    assignment.environmentalResourceRecordIds = toObjectIdList(environmentalResourceRecordIds);
    assignment.energyConsumptionRecordIds = toObjectIdList(energyConsumptionRecordIds);
    assignment.waterManagementSystemIds = toObjectIdList(waterManagementSystemIds);
    assignment.wasteManagementPracticeIds = toObjectIdList(wasteManagementPracticeIds);
    assignment.genderEquityProgramIds = toObjectIdList(genderEquityProgramIds);
    assignment.inclusivenessFacilityIds = toObjectIdList(inclusivenessFacilityIds);
    assignment.ethicsProgramIds = toObjectIdList(ethicsProgramIds);
    assignment.codeOfConductRecordIds = toObjectIdList(codeOfConductRecordIds);
    assignment.communityOutreachProgramIds = toObjectIdList(communityOutreachProgramIds);
    assignment.outreachParticipantIds = toObjectIdList(outreachParticipantIds);
    assignment.institutionalBestPracticeIds = toObjectIdList(institutionalBestPracticeIds);
    assignment.institutionalDistinctivenessIds = toObjectIdList(institutionalDistinctivenessIds);
    assignment.sustainabilityAuditIds = toObjectIdList(sustainabilityAuditIds);
    assignment.supportingLinks = input.supportingLinks;
    assignment.documentIds = toObjectIdList(input.documentIds);
    assignment.contributorRemarks = input.contributorRemarks || undefined;
    await assignment.save();

    await createAuditEntry(
        actor,
        "DRAFT_SAVE",
        "institutional_values_best_practices_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function submitInstitutionalValuesBestPracticesAssignment(
    actor: InstitutionalValuesBestPracticesActor,
    assignmentId: string
) {
    await dbConnect();

    const { assignment, plan } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() !== actor.id) {
        throw new AuthError("This Criteria 7 assignment is not mapped to your account.", 403);
    }

    if (!assignment.isActive) {
        throw new AuthError("This Criteria 7 assignment is inactive.", 409);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or returned assignments can be submitted.", 409);
    }

    if (plan.status !== "Active") {
        throw new AuthError("The plan must be active before submission.", 400);
    }

    const hydrated = (await hydrateAssignments([assignment.toObject()], actor))[0];
    validateContributionForSubmission(hydrated);

    const transition = resolveWorkflowTransition(
        await getActiveWorkflowDefinition("INSTITUTIONAL_VALUES_BEST_PRACTICES"),
        assignment.status,
        "submit"
    );

    const oldData = assignment.toObject();
    assignment.status = transition.status as InstitutionalValuesBestPracticesWorkflowStatus;
    assignment.submittedAt = new Date();
    assignment.reviewedAt = undefined;
    assignment.approvedAt = undefined;
    assignment.approvedBy = undefined;
    assignment.reviewRemarks = undefined;
    createStatusLog(assignment, actor, assignment.status, "Submitted for review");
    await assignment.save();

    await syncWorkflowInstanceState({
        moduleName: "INSTITUTIONAL_VALUES_BEST_PRACTICES",
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
        remarks: "Contributor submitted institutional values record",
        action: "submit",
    });

    await createAuditEntry(
        actor,
        "SUBMIT",
        "institutional_values_best_practices_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function reviewInstitutionalValuesBestPracticesAssignment(
    actor: InstitutionalValuesBestPracticesActor,
    assignmentId: string,
    rawInput: unknown
) {
    await dbConnect();

    const input = institutionalValuesBestPracticesReviewSchema.parse(rawInput);
    const { assignment } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() === actor.id && actor.role !== "Admin") {
        throw new AuthError("Contributors cannot review their own Criteria 7 assignment.", 403);
    }

    const workflowDefinition = await getActiveWorkflowDefinition("INSTITUTIONAL_VALUES_BEST_PRACTICES");
    const currentStage = getWorkflowStageByStatus(workflowDefinition, assignment.status);

    if (!currentStage) {
        throw new AuthError("This record is not pending review.", 409);
    }

    const canReview = await canActorProcessWorkflowStage({
        actor,
        moduleName: "INSTITUTIONAL_VALUES_BEST_PRACTICES",
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
        throw new AuthError("You are not authorized to review this record.", 403);
    }

    const allowedDecisions =
        currentStage.kind === "final"
            ? ["Approve", "Reject"]
            : ["Forward", "Recommend", "Reject"];

    if (!allowedDecisions.includes(input.decision)) {
        throw new AuthError("This decision is not allowed for the current review stage.", 400);
    }

    const action = input.decision === "Reject" ? "reject" : "approve";
    const transition = resolveWorkflowTransition(workflowDefinition, assignment.status, action);
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
    assignment.status = transition.status as InstitutionalValuesBestPracticesWorkflowStatus;
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
        moduleName: "INSTITUTIONAL_VALUES_BEST_PRACTICES",
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
        "institutional_values_best_practices_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );

    return assignment;
}

export async function getInstitutionalValuesBestPracticesContributorWorkspace(
    actor: InstitutionalValuesBestPracticesActor
) {
    await dbConnect();

    const assignments = await InstitutionalValuesBestPracticesAssignment.find({
        assigneeUserId: ensureObjectId(actor.id, "Current user is invalid."),
        isActive: true,
    })
        .sort({ updatedAt: -1 })
        .lean();

    return {
        assignments: await hydrateAssignments(assignments, actor),
    };
}

export async function getInstitutionalValuesBestPracticesReviewWorkspace(
    actor: InstitutionalValuesBestPracticesActor
) {
    await dbConnect();

    const profile = await resolveAuthorizationProfile(actor);
    let assignments: Array<Record<string, any>> = [];

    if (actor.role === "Admin") {
        assignments = await InstitutionalValuesBestPracticesAssignment.find({})
            .sort({ updatedAt: -1 })
            .lean();
    } else if (canListModuleRecords(profile, "INSTITUTIONAL_VALUES_BEST_PRACTICES")) {
        assignments = await InstitutionalValuesBestPracticesAssignment.find(
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
