import { Types, type ClientSession } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import Organization from "@/models/core/organization";
import WorkflowDefinition, {
    type IWorkflowDefinition,
    type IWorkflowDefinitionStage,
    type WorkflowApproverRole,
    type WorkflowModuleName,
    type WorkflowStageKind,
} from "@/models/core/workflow-definition";
import WorkflowInstance from "@/models/core/workflow-instance";

export type WorkflowAction = "submit" | "approve" | "reject";

export type WorkflowActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
};

export type WorkflowActorContext = {
    approverRoles: WorkflowApproverRole[];
    headedDepartmentNames: string[];
};

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
                label: "PBAS Committee Review",
                status: "Under Review",
                kind: "review",
                scope: "global",
                approverRoles: ["DIRECTOR"],
            },
            {
                key: "final_approval",
                label: "Principal Approval",
                status: "Committee Review",
                kind: "final",
                scope: "global",
                approverRoles: ["ADMIN"],
            },
        ],
    },
    {
        moduleName: "CAS",
        name: "CAS Default Review Chain",
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
                approverRoles: ["DIRECTOR"],
            },
            {
                key: "final_approval",
                label: "Principal Approval",
                status: "Committee Review",
                kind: "final",
                scope: "global",
                approverRoles: ["ADMIN"],
            },
        ],
    },
    {
        moduleName: "AQAR",
        name: "AQAR Default Review Chain",
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
                approverRoles: ["DIRECTOR"],
            },
            {
                key: "final_approval",
                label: "Principal Approval",
                status: "Committee Review",
                kind: "final",
                scope: "global",
                approverRoles: ["ADMIN"],
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
    await dbConnect();

    const approverRoles = new Set<WorkflowApproverRole>();
    const headedDepartmentNames: string[] = [];

    if (actor.role === "Faculty") approverRoles.add("FACULTY");
    if (actor.role === "Director") approverRoles.add("DIRECTOR");
    if (actor.role === "Admin") approverRoles.add("ADMIN");

    const headedOrganizations = await Organization.find({
        headUserId: actor.id,
        isActive: true,
    }).select("name type headTitle");

    for (const organization of headedOrganizations) {
        const normalizedName = organization.name.toLowerCase();
        const normalizedTitle = String(organization.headTitle ?? "").toLowerCase();

        if (organization.type === "Department") {
            approverRoles.add("DEPARTMENT_HEAD");
            headedDepartmentNames.push(organization.name);
        }

        if (normalizedName.includes("iqac") || normalizedTitle.includes("iqac")) {
            approverRoles.add("IQAC");
        }

        if (normalizedName.includes("principal") || normalizedTitle.includes("principal")) {
            approverRoles.add("PRINCIPAL");
        }
    }

    return {
        approverRoles: Array.from(approverRoles),
        headedDepartmentNames,
    };
}

function actorMatchesWorkflowStage(
    stage: Pick<IWorkflowDefinitionStage, "approverRoles" | "scope"> | null,
    context: WorkflowActorContext,
    instance: { scopeDepartmentName?: string | null }
) {
    if (!stage) {
        return false;
    }

    for (const role of context.approverRoles) {
        if (!stage.approverRoles.includes(role)) {
            continue;
        }

        if (role === "DEPARTMENT_HEAD" && stage.scope === "department") {
            if (
                instance.scopeDepartmentName &&
                context.headedDepartmentNames.includes(instance.scopeDepartmentName)
            ) {
                return true;
            }

            continue;
        }

        return true;
    }

    return false;
}

export async function syncWorkflowInstanceState(options: {
    moduleName: WorkflowModuleName;
    recordId: string;
    status: string;
    subjectDepartmentName?: string;
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
    return actorMatchesWorkflowStage(
        stage,
        actorContext,
        { scopeDepartmentName: options.subjectDepartmentName }
    );
}

export async function listPendingWorkflowRecordIds(options: {
    actor: WorkflowActor;
    moduleName: WorkflowModuleName;
    stageKinds?: WorkflowStageKind[];
}) {
    const actorContext = await resolveWorkflowActorContext(options.actor);

    if (!actorContext.approverRoles.length) {
        return [];
    }

    const instances = await WorkflowInstance.find({
        moduleName: options.moduleName,
        isActive: true,
        currentApproverRoles: { $in: actorContext.approverRoles },
    })
        .select("recordId currentApproverRoles currentStageKind scopeDepartmentName")
        .lean();

    return instances
        .filter((instance) => {
            if (options.stageKinds?.length) {
                const stageKind = instance.currentStageKind as WorkflowStageKind | undefined;
                if (!stageKind || !options.stageKinds.includes(stageKind)) {
                    return false;
                }
            }

            for (const role of actorContext.approverRoles) {
                if (!instance.currentApproverRoles.includes(role)) {
                    continue;
                }

                if (role === "DEPARTMENT_HEAD") {
                    return Boolean(
                        instance.scopeDepartmentName &&
                        actorContext.headedDepartmentNames.includes(instance.scopeDepartmentName)
                    );
                }

                return true;
            }

            return false;
        })
        .map((instance) => instance.recordId);
}
