/**
 * Typed test data factories.
 *
 * Central builders for the fixtures used across the test suite. Using factories
 * (rather than inline literals) keeps tests readable, gives them correct types
 * for free, and means a schema change is fixed in one place instead of every
 * test.
 *
 * Every factory takes a partial `overrides` object and deep-merges it over a
 * sensible default, so a test only states the fields it actually cares about.
 */
import type {
    IWorkflowDefinitionStage,
    WorkflowModuleName,
} from "@/models/core/workflow-definition";

/**
 * A plain, insertable workflow-definition shape.
 *
 * Matches the fields `WorkflowDefinition.create()` accepts and the subset the
 * pure engine functions read (`stages`, `draftStatus`, `approvedStatus`,
 * `rejectedStatus`). Kept as a standalone type (not the Mongoose `Document`) so
 * it is convenient to build and assert against.
 */
export interface WorkflowDefinitionInput {
    moduleName: WorkflowModuleName;
    name: string;
    version: number;
    isActive: boolean;
    draftStatus: string;
    approvedStatus: string;
    rejectedStatus: string;
    stages: IWorkflowDefinitionStage[];
}

/**
 * The default three-stage review chain used by the engine unit tests:
 * `Submitted` → `Under Review` → `Committee Review (final)` → `Approved`.
 *
 * Mirrors the real PBAS-style shape closely enough to characterise the engine's
 * transition logic without depending on the seeded production definitions.
 */
function defaultStages(): IWorkflowDefinitionStage[] {
    return [
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
            label: "Committee Review",
            status: "Under Review",
            kind: "review",
            scope: "global",
            approverRoles: ["IQAC", "DIRECTOR"],
        },
        {
            key: "final_approval",
            label: "Principal Approval",
            status: "Committee Review",
            kind: "final",
            scope: "global",
            approverRoles: ["PRINCIPAL", "ADMIN"],
        },
    ];
}

/**
 * Build a fully-typed workflow definition for tests.
 *
 * @param overrides Fields to override on the default definition. `stages`, if
 *                  provided, replaces the default chain wholesale.
 */
export function makeWorkflowDefinition(
    overrides: Partial<WorkflowDefinitionInput> = {}
): WorkflowDefinitionInput {
    return {
        moduleName: "PBAS",
        name: "Test Review Chain",
        version: 1,
        isActive: true,
        draftStatus: "Draft",
        approvedStatus: "Approved",
        rejectedStatus: "Rejected",
        stages: defaultStages(),
        ...overrides,
    };
}

/**
 * Build a single workflow stage, defaulting to a department-scoped review stage.
 * Handy for composing custom chains in a test.
 */
export function makeWorkflowStage(
    overrides: Partial<IWorkflowDefinitionStage> = {}
): IWorkflowDefinitionStage {
    return {
        key: "review_stage",
        label: "Review Stage",
        status: "Submitted",
        kind: "review",
        scope: "department",
        approverRoles: ["DEPARTMENT_HEAD"],
        ...overrides,
    };
}
