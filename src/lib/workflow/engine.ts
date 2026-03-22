import { Types, type ClientSession } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import {
    listActiveLeadershipAssignmentsForUser,
    listActiveWorkflowCommitteeMembershipsForUser,
    mapLeadershipAssignmentTypeToWorkflowRoles,
} from "@/lib/governance/service";
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
    principalScopes: WorkflowSubjectScope[];
    committeeScopes: Partial<Record<WorkflowApproverRole, WorkflowSubjectScope[]>>;
};

export type WorkflowSubjectScope = {
    departmentName?: string;
    collegeName?: string;
    universityName?: string;
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
        version: 2,
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
                approverRoles: ["PRINCIPAL", "ADMIN"],
            },
        ],
    },
    {
        moduleName: "CAS",
        name: "CAS Default Review Chain",
        version: 2,
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
                approverRoles: ["PRINCIPAL", "ADMIN"],
            },
        ],
    },
    {
        moduleName: "AQAR",
        name: "AQAR Default Review Chain",
        version: 2,
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
    await dbConnect();

    const approverRoles = new Set<WorkflowApproverRole>();
    const headedDepartmentNames: string[] = [];
    const principalScopes: WorkflowSubjectScope[] = [];
    const committeeScopes: Partial<Record<WorkflowApproverRole, WorkflowSubjectScope[]>> = {};

    if (actor.role === "Faculty") approverRoles.add("FACULTY");
    if (actor.role === "Director") approverRoles.add("DIRECTOR");
    if (actor.role === "Admin") approverRoles.add("ADMIN");

    const [leadershipAssignments, workflowCommittees] = await Promise.all([
        listActiveLeadershipAssignmentsForUser(actor.id),
        listActiveWorkflowCommitteeMembershipsForUser(actor.id),
    ]);

    for (const assignment of leadershipAssignments) {
        for (const role of mapLeadershipAssignmentTypeToWorkflowRoles(
            assignment.assignmentType as Parameters<typeof mapLeadershipAssignmentTypeToWorkflowRoles>[0]
        )) {
            approverRoles.add(role);
        }

        if (assignment.assignmentType === "HOD" && assignment.organizationName) {
            headedDepartmentNames.push(assignment.organizationName);
        }

        if (assignment.assignmentType === "PRINCIPAL") {
            principalScopes.push({
                collegeName: assignment.collegeName || assignment.organizationName,
                universityName: assignment.universityName,
            });
        }

        if (assignment.assignmentType === "IQAC_COORDINATOR") {
            const current = committeeScopes.IQAC ?? [];
            current.push({
                collegeName: assignment.collegeName || undefined,
                universityName: assignment.universityName || undefined,
            });
            committeeScopes.IQAC = current;
        }
    }

    for (const committee of workflowCommittees) {
        const role =
            committee.committeeType === "IQAC"
                ? "IQAC"
                : committee.committeeType === "PBAS_REVIEW"
                  ? "PBAS_COMMITTEE"
                  : committee.committeeType === "CAS_SCREENING"
                    ? "CAS_COMMITTEE"
                    : committee.committeeType === "AQAR_REVIEW"
                      ? "AQAR_COMMITTEE"
                      : null;

        if (!role) {
            continue;
        }

        approverRoles.add(role);
        const current = committeeScopes[role] ?? [];
        current.push({
            departmentName: committee.organizationType === "Department" ? committee.organizationName : undefined,
            collegeName: committee.collegeName || (committee.organizationType === "College" ? committee.organizationName : undefined),
            universityName:
                committee.universityName || (committee.organizationType === "University" ? committee.organizationName : undefined),
        });
        committeeScopes[role] = current;
    }

    const headedOrganizations = await Organization.find({
        headUserId: actor.id,
        isActive: true,
    }).select("name type headTitle collegeName universityName");

    for (const organization of headedOrganizations) {
        const normalizedName = organization.name.toLowerCase();
        const normalizedTitle = String(organization.headTitle ?? "").toLowerCase();

        if (organization.type === "Department") {
            approverRoles.add("DEPARTMENT_HEAD");
            headedDepartmentNames.push(organization.name);
        }

        if (normalizedName.includes("iqac") || normalizedTitle.includes("iqac")) {
            approverRoles.add("IQAC");
            const current = committeeScopes.IQAC ?? [];
            current.push({
                collegeName:
                    organization.collegeName ||
                    (organization.type === "College" ? organization.name : undefined),
                universityName:
                    organization.universityName ||
                    (organization.type === "University" ? organization.name : undefined),
            });
            committeeScopes.IQAC = current;
        }

        if (normalizedName.includes("principal") || normalizedTitle.includes("principal")) {
            approverRoles.add("PRINCIPAL");
            principalScopes.push({
                collegeName:
                    organization.collegeName ||
                    (organization.type === "College" ? organization.name : undefined),
                universityName:
                    organization.universityName ||
                    (organization.type === "University" ? organization.name : undefined),
            });
        }
    }

    return {
        approverRoles: Array.from(approverRoles),
        headedDepartmentNames,
        principalScopes,
        committeeScopes,
    };
}

function matchesScopedAssignment(
    subject: WorkflowSubjectScope,
    scope: WorkflowSubjectScope
) {
    if (scope.departmentName) {
        return scope.departmentName === subject.departmentName;
    }

    if (scope.collegeName) {
        return scope.collegeName === subject.collegeName;
    }

    if (scope.universityName) {
        return scope.universityName === subject.universityName;
    }

    return true;
}

function actorMatchesWorkflowStage(
    stage: Pick<IWorkflowDefinitionStage, "approverRoles" | "scope"> | null,
    context: WorkflowActorContext,
    instance: {
        scopeDepartmentName?: string | null;
        scopeCollegeName?: string | null;
        scopeUniversityName?: string | null;
    }
) {
    if (!stage) {
        return false;
    }

    const subject: WorkflowSubjectScope = {
        departmentName: instance.scopeDepartmentName ?? undefined,
        collegeName: instance.scopeCollegeName ?? undefined,
        universityName: instance.scopeUniversityName ?? undefined,
    };

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

        if (role === "PRINCIPAL") {
            if (context.principalScopes.some((scope) => matchesScopedAssignment(subject, scope))) {
                return true;
            }

            continue;
        }

        if (
            role === "IQAC" ||
            role === "PBAS_COMMITTEE" ||
            role === "CAS_COMMITTEE" ||
            role === "AQAR_COMMITTEE"
        ) {
            const scopes = context.committeeScopes[role] ?? [];
            if (scopes.some((scope) => matchesScopedAssignment(subject, scope))) {
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
    subjectCollegeName?: string;
    subjectUniversityName?: string;
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
        {
            scopeDepartmentName: options.subjectDepartmentName,
            scopeCollegeName: options.subjectCollegeName,
            scopeUniversityName: options.subjectUniversityName,
        }
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
        .select("recordId currentApproverRoles currentStageKind scopeDepartmentName scopeCollegeName scopeUniversityName")
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

                if (role === "PRINCIPAL") {
                    return actorContext.principalScopes.some((scope) =>
                        matchesScopedAssignment(
                            {
                                departmentName: instance.scopeDepartmentName ?? undefined,
                                collegeName: instance.scopeCollegeName ?? undefined,
                                universityName: instance.scopeUniversityName ?? undefined,
                            },
                            scope
                        )
                    );
                }

                if (
                    role === "IQAC" ||
                    role === "PBAS_COMMITTEE" ||
                    role === "CAS_COMMITTEE" ||
                    role === "AQAR_COMMITTEE"
                ) {
                    return (actorContext.committeeScopes[role] ?? []).some((scope) =>
                        matchesScopedAssignment(
                            {
                                departmentName: instance.scopeDepartmentName ?? undefined,
                                collegeName: instance.scopeCollegeName ?? undefined,
                                universityName: instance.scopeUniversityName ?? undefined,
                            },
                            scope
                        )
                    );
                }

                return true;
            }

            return false;
        })
        .map((instance) => instance.recordId);
}
