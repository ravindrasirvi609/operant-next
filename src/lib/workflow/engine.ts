import { Types, type ClientSession } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import {
    canReviewWorkflowStage,
    resolveAuthorizationProfile,
    type AuthorizationActor,
    type AuthorizationProfile,
    type AuthorizationSubjectScope,
} from "@/lib/authorization/service";
import WorkflowDefinition, {
    type IWorkflowDefinition,
    type IWorkflowDefinitionStage,
    type WorkflowApproverRole,
    type WorkflowModuleName,
    type WorkflowStageKind,
} from "@/models/core/workflow-definition";
import WorkflowInstance from "@/models/core/workflow-instance";

export type WorkflowAction = "submit" | "approve" | "reject";

export type WorkflowActor = AuthorizationActor;
export type WorkflowActorContext = AuthorizationProfile;
export type WorkflowSubjectScope = AuthorizationSubjectScope;

type WorkflowDefinitionSeed = {
    moduleName: WorkflowModuleName;
    name: string;
    version: number;
    draftStatus: string;
    approvedStatus: string;
    rejectedStatus: string;
    stages: Array<{
        key: string;
        label: string;
        status: string;
        kind: WorkflowStageKind;
        scope: "global" | "department";
        approverRoles: WorkflowApproverRole[];
    }>;
};

export type WorkflowTransition = {
    status: string;
    stage: IWorkflowDefinitionStage | null;
    action: WorkflowAction;
    completed: boolean;
};

const DEFAULT_WORKFLOW_DEFINITIONS: WorkflowDefinitionSeed[] = [
    {
        moduleName: "PBAS",
        name: "PBAS Default Review Chain",
        version: 3,
        draftStatus: "Draft",
        approvedStatus: "Approved",
        rejectedStatus: "Rejected",
        stages: [
            {
                key: "department_head_review",
                label: "Department Head Review",
                status: "Submitted",
                kind: "review",
                scope: "department",
                approverRoles: ["DEPARTMENT_HEAD", "DIRECTOR"],
            },
            {
                key: "committee_review",
                label: "PBAS Committee Review",
                status: "Under Review",
                kind: "review",
                scope: "global",
                approverRoles: ["PBAS_COMMITTEE", "IQAC", "DIRECTOR"],
            },
            {
                key: "final_approval",
                label: "Principal Approval",
                status: "Committee Review",
                kind: "final",
                scope: "global",
                approverRoles: ["PRINCIPAL"],
            },
        ],
    },
    {
        moduleName: "CAS",
        name: "CAS Default Review Chain",
        version: 3,
        draftStatus: "Draft",
        approvedStatus: "Approved",
        rejectedStatus: "Rejected",
        stages: [
            {
                key: "department_head_review",
                label: "Department Head Review",
                status: "Submitted",
                kind: "review",
                scope: "department",
                approverRoles: ["DEPARTMENT_HEAD", "DIRECTOR"],
            },
            {
                key: "committee_review",
                label: "CAS Screening Committee Review",
                status: "Under Review",
                kind: "review",
                scope: "global",
                approverRoles: ["CAS_COMMITTEE", "IQAC", "DIRECTOR"],
            },
            {
                key: "final_approval",
                label: "Principal Approval",
                status: "Committee Review",
                kind: "final",
                scope: "global",
                approverRoles: ["PRINCIPAL"],
            },
        ],
    },
    {
        moduleName: "AQAR",
        name: "AQAR Default Review Chain",
        version: 3,
        draftStatus: "Draft",
        approvedStatus: "Approved",
        rejectedStatus: "Rejected",
        stages: [
            {
                key: "department_head_review",
                label: "Department Head Review",
                status: "Submitted",
                kind: "review",
                scope: "department",
                approverRoles: ["DEPARTMENT_HEAD", "DIRECTOR"],
            },
            {
                key: "committee_review",
                label: "IQAC Review",
                status: "Under Review",
                kind: "review",
                scope: "global",
                approverRoles: ["AQAR_COMMITTEE", "IQAC", "DIRECTOR"],
            },
            {
                key: "final_approval",
                label: "Principal Approval",
                status: "Committee Review",
                kind: "final",
                scope: "global",
                approverRoles: ["PRINCIPAL"],
            },
        ],
    },
    {
        moduleName: "SSR",
        name: "SSR Default Review Chain",
        version: 1,
        draftStatus: "Draft",
        approvedStatus: "Approved",
        rejectedStatus: "Rejected",
        stages: [
            {
                key: "department_head_review",
                label: "Department Head Review",
                status: "Submitted",
                kind: "review",
                scope: "department",
                approverRoles: ["DEPARTMENT_HEAD", "DIRECTOR"],
            },
            {
                key: "committee_review",
                label: "IQAC Review",
                status: "Under Review",
                kind: "review",
                scope: "global",
                approverRoles: ["SSR_COMMITTEE", "IQAC", "DIRECTOR", "ADMIN"],
            },
            {
                key: "final_approval",
                label: "Principal Approval",
                status: "Committee Review",
                kind: "final",
                scope: "global",
                approverRoles: ["PRINCIPAL", "ADMIN"],
            },
        ],
    },
    {
        moduleName: "CURRICULUM",
        name: "Curriculum Default Review Chain",
        version: 1,
        draftStatus: "Draft",
        approvedStatus: "Approved",
        rejectedStatus: "Rejected",
        stages: [
            {
                key: "department_head_review",
                label: "Department Head Review",
                status: "Submitted",
                kind: "review",
                scope: "department",
                approverRoles: ["DEPARTMENT_HEAD", "DIRECTOR"],
            },
            {
                key: "board_of_studies_review",
                label: "Board of Studies Review",
                status: "Board Review",
                kind: "review",
                scope: "department",
                approverRoles: ["BOARD_OF_STUDIES", "DIRECTOR", "ADMIN"],
            },
            {
                key: "iqac_review",
                label: "IQAC Review",
                status: "Under Review",
                kind: "review",
                scope: "global",
                approverRoles: ["IQAC", "DIRECTOR", "ADMIN"],
            },
            {
                key: "final_approval",
                label: "Principal Approval",
                status: "Committee Review",
                kind: "final",
                scope: "global",
                approverRoles: ["PRINCIPAL", "ADMIN"],
            },
        ],
    },
];

function findStageByStatus(definition: Pick<IWorkflowDefinition, "stages">, status: string) {
    return definition.stages.find((stage) => stage.status === status) ?? null;
}

function findStageIndexByStatus(definition: Pick<IWorkflowDefinition, "stages">, status: string) {
    return definition.stages.findIndex((stage) => stage.status === status);
}

function findPrimaryApproverRole(stage: Pick<IWorkflowDefinitionStage, "approverRoles"> | null) {
    return stage?.approverRoles[0];
}

function isRejectedLikeStatus(
    definition: Pick<IWorkflowDefinition, "rejectedStatus" | "draftStatus">,
    status: string
) {
    return status === definition.rejectedStatus || status === definition.draftStatus;
}

export function getWorkflowPendingStatuses(
    definition: Pick<IWorkflowDefinition, "stages">
) {
    return definition.stages.map((stage) => stage.status);
}

export function getWorkflowStageByStatus(
    definition: Pick<IWorkflowDefinition, "stages">,
    status: string
) {
    return findStageByStatus(definition, status);
}

export function resolveWorkflowTransition(
    definition: Pick<IWorkflowDefinition, "stages" | "draftStatus" | "approvedStatus" | "rejectedStatus">,
    currentStatus: string,
    action: WorkflowAction
): WorkflowTransition {
    const currentStage = findStageByStatus(definition, currentStatus);

    if (action === "submit") {
        if (!isRejectedLikeStatus(definition, currentStatus)) {
            throw new Error(`Workflow submit is not allowed while status is ${currentStatus}.`);
        }

        const firstStage = definition.stages[0] ?? null;
        if (!firstStage) {
            throw new Error("Workflow definition must include at least one stage.");
        }

        return {
            action,
            status: firstStage.status,
            stage: firstStage,
            completed: false,
        };
    }

    if (!currentStage) {
        throw new Error(`Workflow action ${action} is not allowed while status is ${currentStatus}.`);
    }

    if (action === "reject") {
        return {
            action,
            status: definition.rejectedStatus,
            stage: null,
            completed: true,
        };
    }

    const currentIndex = findStageIndexByStatus(definition, currentStatus);
    const nextStage = definition.stages[currentIndex + 1] ?? null;

    if (nextStage) {
        return {
            action,
            status: nextStage.status,
            stage: nextStage,
            completed: false,
        };
    }

    return {
        action,
        status: definition.approvedStatus,
        stage: null,
        completed: true,
    };
}

export async function ensureWorkflowDefinitions() {
    await dbConnect();

    await Promise.all(
        DEFAULT_WORKFLOW_DEFINITIONS.map((definition) =>
            WorkflowDefinition.updateOne(
                { moduleName: definition.moduleName, version: definition.version },
                {
                    $setOnInsert: {
                        moduleName: definition.moduleName,
                        name: definition.name,
                        version: definition.version,
                        isActive: true,
                        draftStatus: definition.draftStatus,
                        approvedStatus: definition.approvedStatus,
                        rejectedStatus: definition.rejectedStatus,
                        stages: definition.stages,
                    },
                },
                { upsert: true }
            )
        )
    );
}

export async function getActiveWorkflowDefinition(moduleName: WorkflowModuleName) {
    await ensureWorkflowDefinitions();

    const definition =
        (await WorkflowDefinition.findOne({ moduleName, isActive: true }).sort({ version: -1 })) ||
        (await WorkflowDefinition.findOne({ moduleName }).sort({ version: -1 }));

    if (!definition) {
        throw new Error(`Workflow definition not found for module ${moduleName}.`);
    }

    return definition;
}

export async function resolveWorkflowActorContext(actor: WorkflowActor): Promise<WorkflowActorContext> {
    return resolveAuthorizationProfile(actor);
}

function actorMatchesWorkflowStage(
    stage: Pick<IWorkflowDefinitionStage, "approverRoles" | "scope"> | null,
    context: WorkflowActorContext,
    subject: WorkflowSubjectScope
) {
    if (!stage) {
        return false;
    }

    return canReviewWorkflowStage(context, subject, stage.approverRoles);
}

function toObjectId(value?: string | null) {
    return value && Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : undefined;
}

function toObjectIdList(values?: string[]) {
    return (values ?? [])
        .filter((value) => Types.ObjectId.isValid(value))
        .map((value) => new Types.ObjectId(value));
}

export async function syncWorkflowInstanceState(options: {
    moduleName: WorkflowModuleName;
    recordId: string;
    status: string;
    subjectDepartmentName?: string;
    subjectCollegeName?: string;
    subjectUniversityName?: string;
    subjectDepartmentId?: string;
    subjectInstitutionId?: string;
    subjectDepartmentOrganizationId?: string;
    subjectCollegeOrganizationId?: string;
    subjectUniversityOrganizationId?: string;
    subjectOrganizationIds?: string[];
    actor?: WorkflowActor;
    remarks?: string;
    action?: WorkflowAction;
    session?: ClientSession;
}) {
    const definition = await getActiveWorkflowDefinition(options.moduleName);
    const stage = getWorkflowStageByStatus(definition, options.status);
    const now = new Date();

    await WorkflowInstance.updateOne(
        { moduleName: options.moduleName, recordId: options.recordId },
        {
            $set: {
                moduleName: options.moduleName,
                recordId: options.recordId,
                definitionId: definition._id,
                definitionVersion: definition.version,
                status: options.status,
                currentStageKey: stage?.key,
                currentStageLabel: stage?.label,
                currentStageKind: stage?.kind,
                currentApproverRoles: stage?.approverRoles ?? [],
                currentApproverLabel: stage?.label,
                scopeDepartmentName: options.subjectDepartmentName || undefined,
                scopeCollegeName: options.subjectCollegeName || undefined,
                scopeUniversityName: options.subjectUniversityName || undefined,
                scopeDepartmentId: toObjectId(options.subjectDepartmentId),
                scopeInstitutionId: toObjectId(options.subjectInstitutionId),
                scopeDepartmentOrganizationId: toObjectId(options.subjectDepartmentOrganizationId),
                scopeCollegeOrganizationId: toObjectId(options.subjectCollegeOrganizationId),
                scopeUniversityOrganizationId: toObjectId(options.subjectUniversityOrganizationId),
                scopeOrganizationIds: toObjectIdList(options.subjectOrganizationIds),
                isActive: Boolean(stage),
                completedAt: stage ? undefined : now,
                lastAction: options.action,
                lastActorId: options.actor?.id ? new Types.ObjectId(options.actor.id) : undefined,
                lastActorName: options.actor?.name,
                lastActorRole: options.actor?.role,
                remarks: options.remarks,
            },
            $setOnInsert: {
                startedAt: now,
            },
        },
        { upsert: true, session: options.session }
    );

    return WorkflowInstance.findOne({
        moduleName: options.moduleName,
        recordId: options.recordId,
    }).session(options.session ?? null);
}

export async function getWorkflowInstanceStatus(moduleName: WorkflowModuleName, recordId: string) {
    await ensureWorkflowDefinitions();

    const instance = await WorkflowInstance.findOne({ moduleName, recordId }).lean();
    if (!instance) {
        return null;
    }

    return {
        moduleName: instance.moduleName,
        recordId: instance.recordId,
        currentApproverRole: instance.currentApproverLabel ?? findPrimaryApproverRole({
            approverRoles: instance.currentApproverRoles,
        }) ?? "Completed",
        status: instance.status,
        remarks: instance.remarks,
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt,
    };
}

export async function canActorProcessWorkflowStage(options: {
    actor: WorkflowActor;
    moduleName: WorkflowModuleName;
    recordId: string;
    status: string;
    subjectDepartmentName?: string;
    subjectCollegeName?: string;
    subjectUniversityName?: string;
    subjectDepartmentId?: string;
    subjectInstitutionId?: string;
    subjectDepartmentOrganizationId?: string;
    subjectCollegeOrganizationId?: string;
    subjectUniversityOrganizationId?: string;
    subjectOrganizationIds?: string[];
    stageKinds?: WorkflowStageKind[];
}) {
    const definition = await getActiveWorkflowDefinition(options.moduleName);
    const stage = getWorkflowStageByStatus(definition, options.status);

    if (!stage) {
        return false;
    }

    if (options.stageKinds?.length && !options.stageKinds.includes(stage.kind)) {
        return false;
    }

    const actorContext = await resolveWorkflowActorContext(options.actor);
    return actorMatchesWorkflowStage(stage, actorContext, {
        departmentName: options.subjectDepartmentName,
        collegeName: options.subjectCollegeName,
        universityName: options.subjectUniversityName,
        departmentId: options.subjectDepartmentId,
        institutionId: options.subjectInstitutionId,
        departmentOrganizationId: options.subjectDepartmentOrganizationId,
        collegeOrganizationId: options.subjectCollegeOrganizationId,
        universityOrganizationId: options.subjectUniversityOrganizationId,
        subjectOrganizationIds: options.subjectOrganizationIds,
    });
}

export async function listPendingWorkflowRecordIds(options: {
    actor: WorkflowActor;
    moduleName: WorkflowModuleName;
    stageKinds?: WorkflowStageKind[];
}) {
    const actorContext = await resolveWorkflowActorContext(options.actor);

    const actorWorkflowRoles = actorContext.isAdmin
        ? Array.from(new Set<WorkflowApproverRole>([...actorContext.workflowRoles, "ADMIN"]))
        : actorContext.workflowRoles;

    if (!actorWorkflowRoles.length) {
        return [];
    }

    const instances = await WorkflowInstance.find({
        moduleName: options.moduleName,
        isActive: true,
        currentApproverRoles: { $in: actorWorkflowRoles },
    })
        .select(
            "recordId currentApproverRoles currentStageKind scopeDepartmentName scopeCollegeName scopeUniversityName scopeDepartmentId scopeInstitutionId scopeDepartmentOrganizationId scopeCollegeOrganizationId scopeUniversityOrganizationId scopeOrganizationIds"
        )
        .lean();

    return instances
        .filter((instance) => {
            if (options.stageKinds?.length) {
                const stageKind = instance.currentStageKind as WorkflowStageKind | undefined;
                if (!stageKind || !options.stageKinds.includes(stageKind)) {
                    return false;
                }
            }

            return canReviewWorkflowStage(
                actorContext,
                {
                    departmentName: instance.scopeDepartmentName ?? undefined,
                    collegeName: instance.scopeCollegeName ?? undefined,
                    universityName: instance.scopeUniversityName ?? undefined,
                    departmentId: instance.scopeDepartmentId?.toString(),
                    institutionId: instance.scopeInstitutionId?.toString(),
                    departmentOrganizationId: instance.scopeDepartmentOrganizationId?.toString(),
                    collegeOrganizationId: instance.scopeCollegeOrganizationId?.toString(),
                    universityOrganizationId: instance.scopeUniversityOrganizationId?.toString(),
                    subjectOrganizationIds:
                        instance.scopeOrganizationIds?.map((value) => value.toString()) ?? [],
                },
                instance.currentApproverRoles
            );
        })
        .map((instance) => instance.recordId);
}
