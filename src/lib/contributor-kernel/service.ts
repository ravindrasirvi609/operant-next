/**
 * Contributor Module Kernel — generic service.
 *
 * One implementation of the shared submit/review orchestration that today is
 * copy-pasted across all six criterion modules. It runs the documented recipe:
 *
 *   load → ownership/state guards → (submit: gate) / (review: authz + decision) →
 *   resolveWorkflowTransition → mutate assignment → syncWorkflowInstanceState → audit
 *
 * The module-specific parts (loading, hydration, submission gate, exact
 * messages) come from the {@link ContributorModuleDescriptor}; the workflow
 * engine, scope mapping, review vocabulary, and audit are shared.
 *
 * **Dependencies are injected** (defaulting to the real engine/audit functions)
 * so the kernel is unit-testable with plain fakes — no database, no real
 * workflow graph. This is also the repository/DI seam the refactor plan calls
 * for (P5).
 *
 * ## Wave 1 scope
 * `submit` and `review` — the workflow-critical, most-duplicated operations and
 * the target of the parity tests. `saveDraft`/`list` (which need each module's
 * contribution schema + `applyDraft`/hydration) are added when a real module is
 * wired in Wave 2.
 *
 * @see docs/CONTRIBUTOR_WORKFLOW_IMPROVEMENT_PLAN.md — Waves 1–2
 */
import { Types } from "mongoose";

import { createAuditLog as realCreateAuditLog } from "@/lib/audit/service";
import { AuthError } from "@/lib/auth/errors";
import {
    contributorReviewSchema,
    reviewDecisionToAction,
    validateReviewDecisionForStage,
} from "@/lib/contributor-kernel/review";
import { toWorkflowSubjectScope } from "@/lib/contributor-kernel/scope";
import type {
    ContributorActor,
    ContributorAssignmentDoc,
    ContributorMessages,
    ContributorModuleDescriptor,
} from "@/lib/contributor-kernel/types";
import {
    canActorProcessWorkflowStage as realCanActorProcessWorkflowStage,
    getActiveWorkflowDefinition as realGetActiveWorkflowDefinition,
    getWorkflowStageByStatus as realGetWorkflowStageByStatus,
    resolveWorkflowTransition as realResolveWorkflowTransition,
    syncWorkflowInstanceState as realSyncWorkflowInstanceState,
} from "@/lib/workflow/engine";

/**
 * The shared engine/audit collaborators the kernel calls. Injectable so tests
 * can substitute fakes; defaults wire the real implementations.
 */
export interface ContributorServiceDeps {
    getActiveWorkflowDefinition: typeof realGetActiveWorkflowDefinition;
    resolveWorkflowTransition: typeof realResolveWorkflowTransition;
    getWorkflowStageByStatus: typeof realGetWorkflowStageByStatus;
    canActorProcessWorkflowStage: typeof realCanActorProcessWorkflowStage;
    syncWorkflowInstanceState: typeof realSyncWorkflowInstanceState;
    createAuditLog: typeof realCreateAuditLog;
}

const defaultDeps: ContributorServiceDeps = {
    getActiveWorkflowDefinition: realGetActiveWorkflowDefinition,
    resolveWorkflowTransition: realResolveWorkflowTransition,
    getWorkflowStageByStatus: realGetWorkflowStageByStatus,
    canActorProcessWorkflowStage: realCanActorProcessWorkflowStage,
    syncWorkflowInstanceState: realSyncWorkflowInstanceState,
    createAuditLog: realCreateAuditLog,
};

/** Generic fallbacks; a module overrides any of these via `descriptor.messages`. */
const DEFAULT_MESSAGES: Required<ContributorMessages> = {
    notAssignee: "This assignment is not mapped to your account.",
    inactiveAssignment: "This assignment is inactive.",
    notSubmittable: "Only draft or returned assignments can be submitted.",
    planNotActive: "The plan must be active before submission.",
    selfReviewBlocked: "Contributors cannot review their own assignment.",
    notPendingReview: "This assignment is not pending review.",
    reviewNotAuthorized: "You are not authorized to review this assignment.",
};

const DEFAULT_SUBMITTABLE_STATUSES = ["Draft", "Rejected"];
const DEFAULT_SUBMITTED_REMARK = "Contribution submitted.";

/** Narrow an actor to the audit-log actor shape. */
function toAuditActor(actor: ContributorActor) {
    return { id: actor.id, name: actor.name, role: actor.role };
}

/**
 * Build a module's contributor service (submit + review) from its descriptor.
 *
 * @param descriptor per-module configuration + hooks.
 * @param deps       injected collaborators (defaults to the real engine/audit).
 */
export function createContributorService<
    TAssignment extends ContributorAssignmentDoc,
    THydrated,
>(
    descriptor: ContributorModuleDescriptor<TAssignment, THydrated>,
    deps: ContributorServiceDeps = defaultDeps
) {
    const messages = { ...DEFAULT_MESSAGES, ...descriptor.messages };
    const submittableStatuses = descriptor.submittableStatuses ?? DEFAULT_SUBMITTABLE_STATUSES;
    const submittedRemark = descriptor.submittedRemark ?? DEFAULT_SUBMITTED_REMARK;

    /** Submit a contribution for review (contributor action). */
    async function submit(actor: ContributorActor, assignmentId: string): Promise<TAssignment> {
        const loaded = await descriptor.loadAssignment(assignmentId);
        if (!loaded) {
            throw new AuthError("Assignment not found.", 404);
        }
        const { assignment, planStatus } = loaded;

        if (assignment.assigneeUserId.toString() !== actor.id) {
            throw new AuthError(messages.notAssignee, 403);
        }
        if (!assignment.isActive) {
            throw new AuthError(messages.inactiveAssignment, 409);
        }
        if (!submittableStatuses.includes(assignment.status)) {
            throw new AuthError(messages.notSubmittable, 409);
        }
        if (planStatus !== "Active") {
            throw new AuthError(messages.planNotActive, 400);
        }

        // Module-specific hard rules.
        const hydrated = await descriptor.hydrateForSubmission(assignment, actor);
        const gate = descriptor.submissionGate({ hydrated, actor });
        if (!gate.ok) {
            throw new AuthError(gate.reason, 400);
        }

        const definition = await deps.getActiveWorkflowDefinition(descriptor.moduleName);
        const transition = deps.resolveWorkflowTransition(definition, assignment.status, "submit");

        assignment.status = transition.status;
        assignment.submittedAt = new Date();
        assignment.reviewedAt = undefined;
        assignment.approvedAt = undefined;
        assignment.approvedBy = undefined;
        assignment.reviewRemarks = undefined;
        await assignment.save();

        await deps.syncWorkflowInstanceState({
            moduleName: descriptor.moduleName,
            recordId: assignment._id.toString(),
            status: assignment.status,
            ...toWorkflowSubjectScope(assignment),
            actor,
            remarks: submittedRemark,
            action: "submit",
        });

        await deps.createAuditLog({
            actor: toAuditActor(actor),
            action: "SUBMIT",
            tableName: descriptor.auditTableName,
            recordId: assignment._id.toString(),
            newData: assignment.toObject(),
            auditContext: actor.auditContext,
        });

        return assignment;
    }

    /** Record a reviewer decision and advance/return/approve the record. */
    async function review(
        actor: ContributorActor,
        assignmentId: string,
        rawInput: unknown
    ): Promise<TAssignment> {
        const input = contributorReviewSchema.parse(rawInput);

        const loaded = await descriptor.loadAssignment(assignmentId);
        if (!loaded) {
            throw new AuthError("Assignment not found.", 404);
        }
        const { assignment } = loaded;

        // Contributors may not review their own work (admins may, e.g. to unblock).
        if (assignment.assigneeUserId.toString() === actor.id && actor.role !== "Admin") {
            throw new AuthError(messages.selfReviewBlocked, 403);
        }

        const definition = await deps.getActiveWorkflowDefinition(descriptor.moduleName);
        const currentStage = deps.getWorkflowStageByStatus(definition, assignment.status);
        if (!currentStage) {
            throw new AuthError(messages.notPendingReview, 409);
        }

        const subject = toWorkflowSubjectScope(assignment);

        const canReview = await deps.canActorProcessWorkflowStage({
            actor,
            moduleName: descriptor.moduleName,
            recordId: assignment._id.toString(),
            status: assignment.status,
            ...subject,
            stageKinds: [currentStage.kind],
        });
        if (!canReview) {
            throw new AuthError(messages.reviewNotAuthorized, 403);
        }

        const decisionError = validateReviewDecisionForStage(currentStage.kind, input.decision);
        if (decisionError) {
            throw new AuthError(decisionError, 400);
        }

        const oldData = assignment.toObject();
        const action = reviewDecisionToAction(input.decision);
        const transition = deps.resolveWorkflowTransition(definition, assignment.status, action);

        assignment.status = transition.status;
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

        if (transition.completed && transition.status === definition.approvedStatus) {
            assignment.approvedAt = new Date();
            assignment.approvedBy = new Types.ObjectId(actor.id);
        } else if (transition.status === definition.rejectedStatus) {
            assignment.approvedAt = undefined;
            assignment.approvedBy = undefined;
        }

        await assignment.save();

        await deps.syncWorkflowInstanceState({
            moduleName: descriptor.moduleName,
            recordId: assignment._id.toString(),
            status: assignment.status,
            ...subject,
            actor,
            remarks: input.remarks,
            action,
        });

        await deps.createAuditLog({
            actor: toAuditActor(actor),
            action: "REVIEW",
            tableName: descriptor.auditTableName,
            recordId: assignment._id.toString(),
            oldData,
            newData: assignment.toObject(),
            auditContext: actor.auditContext,
        });

        return assignment;
    }

    return { submit, review };
}

/** The shape returned by {@link createContributorService}. */
export type ContributorService<
    TAssignment extends ContributorAssignmentDoc = ContributorAssignmentDoc,
> = {
    submit(actor: ContributorActor, assignmentId: string): Promise<TAssignment>;
    review(actor: ContributorActor, assignmentId: string, rawInput: unknown): Promise<TAssignment>;
};
