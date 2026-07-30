/**
 * Shared review-decision vocabulary for the contributor workflow.
 *
 * All six criterion modules use the identical decision set and the identical
 * mapping to workflow-engine actions and per-stage validity rules — today this
 * logic is copy-pasted into each module's `review*` service function. These pure
 * helpers are the single source of truth.
 *
 * @see docs/CONTRIBUTOR_WORKFLOW_IMPROVEMENT_PLAN.md (P8 — unify review vocabulary)
 */
import { z } from "zod";

/** The four review decisions, in the order the UIs present them. */
export const REVIEW_DECISIONS = ["Forward", "Recommend", "Approve", "Reject"] as const;

/** Reviewer's choice, as sent by the review UIs across all modules. */
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

/**
 * The review request body, identical across all six modules today (each has its
 * own copy). The kernel owns the single shared schema (P3 — unify validators).
 */
export const contributorReviewSchema = z.object({
    remarks: z.string().trim().max(4000).optional(),
    decision: z.enum(REVIEW_DECISIONS),
});

/** Validated review input. */
export type ContributorReviewInput = z.infer<typeof contributorReviewSchema>;

/** The engine action a decision maps to (see `resolveWorkflowTransition`). */
export type ReviewWorkflowAction = "approve" | "reject";

/** Stage kinds a record can sit at (mirrors `WorkflowStageKind`). */
export type ReviewStageKind = "review" | "final";

/**
 * Map a reviewer decision to the workflow-engine action. `Reject` rejects;
 * every other decision advances the record (an "approve" transition), matching
 * the current per-module behaviour (`action = decision === "Reject" ? "reject" : "approve"`).
 */
export function reviewDecisionToAction(decision: ReviewDecision): ReviewWorkflowAction {
    return decision === "Reject" ? "reject" : "approve";
}

/**
 * Validate that a decision is permitted at the current stage kind. Returns an
 * error message (the exact strings the modules use today) or `null` when valid.
 *
 * - Intermediate `review` stages accept `Forward` / `Recommend` / `Reject`.
 * - The `final` stage accepts `Approve` / `Reject`.
 */
export function validateReviewDecisionForStage(
    stageKind: ReviewStageKind,
    decision: ReviewDecision
): string | null {
    if (stageKind === "review" && !["Forward", "Recommend", "Reject"].includes(decision)) {
        return "Use Forward, Recommend, or Reject during review stages.";
    }

    if (stageKind === "final" && !["Approve", "Reject"].includes(decision)) {
        return "Use Approve or Reject during final approval.";
    }

    return null;
}
