/**
 * Contract types for the Contributor Module Kernel.
 *
 * The kernel collapses the ~6× duplicated submit/review orchestration (see
 * `docs/CONTRIBUTOR_WORKFLOW_IMPROVEMENT_PLAN.md`) into one implementation
 * parameterised by a per-module {@link ContributorModuleDescriptor}. Only the
 * genuinely module-specific pieces are hooks: loading the record, hydrating it,
 * and the submission gate. Everything else — workflow transitions, scope
 * mapping, review-decision rules, audit — is shared (see `service.ts`).
 *
 * Wave 1 status: this contract and the generic service exist beside the current
 * modules and are imported by none of them. Wiring a real module (Teaching-
 * Learning first) behind parity tests is Wave 2.
 */
import type { AuditRequestContext } from "@/lib/audit/service";
import type { WorkflowModuleName } from "@/models/core/workflow-definition";

import type { ContributorScopeSource } from "@/lib/contributor-kernel/scope";

/**
 * The actor context every contributor service function receives. Identical
 * across all six modules today (only the local type alias name differs).
 */
export interface ContributorActor {
    id: string;
    name: string;
    role: string;
    department?: string;
    collegeName?: string;
    universityName?: string;
    auditContext?: AuditRequestContext;
}

/** One entry appended to an assignment's review history on each decision. */
export interface ContributorReviewHistoryEntry {
    reviewerId: unknown;
    reviewerName?: string;
    reviewerRole?: string;
    stage: string;
    decision: string;
    remarks?: string;
    reviewedAt: Date;
}

/**
 * The structural shape of a contributor assignment document the kernel reads and
 * mutates. Deliberately minimal and structural (not a Mongoose `Document`) so
 * the kernel is decoupled from any specific model and unit-testable with plain
 * objects. Each module's real assignment model is a superset of this.
 */
export interface ContributorAssignmentDoc extends ContributorScopeSource {
    _id: { toString(): string };
    assigneeUserId: { toString(): string };
    isActive: boolean;
    status: string;
    submittedAt?: Date;
    reviewedAt?: Date;
    approvedAt?: Date;
    approvedBy?: unknown;
    reviewRemarks?: string;
    reviewHistory: ContributorReviewHistoryEntry[];
    save(): Promise<unknown>;
    toObject(): unknown;
}

/** Result of a submission gate: either OK, or a rejection reason (HTTP 400). */
export type SubmitCheck = { ok: true } | { ok: false; reason: string };

/** Context passed to a module's submission gate. */
export interface SubmissionContext<THydrated> {
    /** The module's hydrated view of the assignment (its own richer shape). */
    hydrated: THydrated;
    actor: ContributorActor;
}

/**
 * Overridable, module-specific user-facing messages. Each has a generic default
 * in the service; a module supplies its exact strings here to preserve
 * byte-for-byte parity during migration (Wave 2).
 */
export interface ContributorMessages {
    notAssignee?: string;
    inactiveAssignment?: string;
    notSubmittable?: string;
    planNotActive?: string;
    selfReviewBlocked?: string;
    notPendingReview?: string;
    reviewNotAuthorized?: string;
}

/**
 * The declarative, per-module configuration that drives the kernel. A module
 * provides this once instead of re-implementing the whole service.
 *
 * @typeParam TAssignment - the module's assignment document type (⊇ {@link ContributorAssignmentDoc}).
 * @typeParam THydrated   - the module's hydrated assignment view (input to the gate).
 */
export interface ContributorModuleDescriptor<
    TAssignment extends ContributorAssignmentDoc,
    THydrated,
> {
    /** Workflow module key, e.g. "TEACHING_LEARNING". */
    moduleName: WorkflowModuleName;
    /** Audit `tableName`, e.g. "teaching_learning_assignments". */
    auditTableName: string;
    /** Statuses from which a contributor may (re)submit. Default: ["Draft", "Rejected"]. */
    submittableStatuses?: string[];
    /** Remark recorded on the status log / workflow sync at submission. */
    submittedRemark?: string;

    /** Load the assignment (+ its plan's status) by id, or return null if absent. */
    loadAssignment(
        assignmentId: string
    ): Promise<{ assignment: TAssignment; planStatus: string } | null>;

    /** Build the module's rich hydrated view used by the submission gate. */
    hydrateForSubmission(assignment: TAssignment, actor: ContributorActor): Promise<THydrated>;

    /** Module-specific hard rules enforced before a contribution may be submitted. */
    submissionGate(context: SubmissionContext<THydrated>): SubmitCheck;

    /** Optional exact user-facing messages (for parity); generic defaults otherwise. */
    messages?: ContributorMessages;
}
