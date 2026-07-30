# Contributor Module Kernel

One config-driven implementation of the contributor **submit → review** workflow shared by the six NAAC criterion modules (Teaching-Learning, Research-Innovation, Infrastructure-Library, Student-Support-Governance, Governance-Leadership-IQAC, Institutional-Values-Best-Practices).

Today each module re-implements the same ~2,000-line orchestration (~13,100 lines total). This kernel collapses the shared parts into one place; a module supplies only a small **descriptor**.

> **Status — Wave 1 (foundation).** This folder exists beside the current modules and is imported by **none** of them (rollback = delete the folder). Wiring a real module through it, behind byte-for-byte parity tests, is **Wave 2**. See [`docs/CONTRIBUTOR_WORKFLOW_IMPROVEMENT_PLAN.md`](../../../docs/CONTRIBUTOR_WORKFLOW_IMPROVEMENT_PLAN.md).

## Pieces

| File | Responsibility |
|---|---|
| [`review.ts`](./review.ts) | Shared review vocabulary: decision→action mapping, per-stage validity, the single review Zod schema. Pure. |
| [`scope.ts`](./scope.ts) | Maps an assignment's 9-field scope block to the workflow engine's subject-scope shape. Pure. |
| [`types.ts`](./types.ts) | The `ContributorModuleDescriptor` contract + `ContributorActor`, `SubmitCheck`, overridable messages. |
| [`service.ts`](./service.ts) | `createContributorService(descriptor, deps?)` → `{ submit, review }`, running the shared recipe. |
| [`index.ts`](./index.ts) | Public barrel. |

## What is shared vs per-module

- **Shared (in the kernel):** state guards, workflow transition, scope mapping, review-decision rules, review-history/approval bookkeeping, `syncWorkflowInstanceState`, audit.
- **Per-module (in the descriptor):** `loadAssignment`, `hydrateForSubmission`, `submissionGate` (the hard rules), the audit table name, and — for exact parity — any overridden user-facing `messages`.

## How a module will use it (Wave 2)

```ts
const descriptor: ContributorModuleDescriptor<ITLAssignment, HydratedTL> = {
    moduleName: "TEACHING_LEARNING",
    auditTableName: "teaching_learning_assignments",
    loadAssignment: (id) => loadAssignmentCore(id),          // existing logic
    hydrateForSubmission: (a, actor) => hydrate(a, actor),   // existing logic
    submissionGate: ({ hydrated }) => checkTLRules(hydrated),// existing hard rules, returning { ok } | { ok:false, reason }
    messages: { notAssignee: "This teaching-learning assignment is not mapped to your account." /* … */ },
};

export const teachingLearning = createContributorService(descriptor);
// route: export const POST = (req, ctx) => ... teachingLearning.submit(actor, id)
```

Then run the module's parity tests (old service vs kernel → identical DB mutations + responses) and delete the duplicated orchestration in the same PR.

## Testing

Dependencies (the workflow engine + audit) are **injected** and default to the real implementations, so the kernel is unit-tested with plain fakes — no database, no real workflow graph:

```ts
const service = createContributorService(descriptor, {
    ...realDeps,
    resolveWorkflowTransition: vi.fn().mockReturnValue({ status: "Submitted", completed: false }),
});
```

See [`service.test.ts`](./service.test.ts) (recipe + guards), [`review.test.ts`](./review.test.ts), [`scope.test.ts`](./scope.test.ts).

## Not yet in the kernel (Wave 2+)

`saveDraft` and the list/hydration read-paths (they need each module's contribution schema + `applyDraft`/hydration hooks), the thin route re-exports, and the generic review-board/workspace UI shells. Tracked as Waves 2–5 in the plan.
