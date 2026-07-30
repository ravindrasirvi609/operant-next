import { afterEach, describe, expect, it, vi } from "vitest";

import { createContributorService, type ContributorServiceDeps } from "@/lib/contributor-kernel/service";
import type {
    ContributorActor,
    ContributorAssignmentDoc,
    ContributorModuleDescriptor,
} from "@/lib/contributor-kernel/types";

// Valid 24-hex ObjectId strings (the review path constructs Types.ObjectId(actor.id)).
const ACTOR_ID = "507f1f77bcf86cd799439011";
const OTHER_ID = "507f1f77bcf86cd799439012";

const actor: ContributorActor = { id: ACTOR_ID, name: "Dr Ada", role: "Faculty" };

type FakeAssignment = ContributorAssignmentDoc & {
    save: ReturnType<typeof vi.fn>;
    toObject: ReturnType<typeof vi.fn>;
};

/** A plain, mutable stand-in for a Mongoose assignment document. */
function makeAssignment(overrides: Partial<ContributorAssignmentDoc> = {}): FakeAssignment {
    return {
        _id: { toString: () => "assignment-1" },
        assigneeUserId: { toString: () => ACTOR_ID },
        isActive: true,
        status: "Draft",
        reviewHistory: [],
        scopeDepartmentName: "Physics",
        scopeOrganizationIds: [],
        save: vi.fn().mockResolvedValue(undefined),
        toObject: vi.fn(() => ({ snapshot: true })),
        ...overrides,
    } as unknown as FakeAssignment;
}

/** Injected engine/audit collaborators, all spies with safe defaults. */
function makeDeps(overrides: Partial<ContributorServiceDeps> = {}): ContributorServiceDeps {
    const definition = { approvedStatus: "Approved", rejectedStatus: "Rejected" };
    return {
        getActiveWorkflowDefinition: vi.fn().mockResolvedValue(definition),
        resolveWorkflowTransition: vi.fn().mockReturnValue({ status: "Submitted", completed: false }),
        getWorkflowStageByStatus: vi.fn().mockReturnValue({ kind: "review", label: "Dept Head Review" }),
        canActorProcessWorkflowStage: vi.fn().mockResolvedValue(true),
        syncWorkflowInstanceState: vi.fn().mockResolvedValue(undefined),
        createAuditLog: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    } as unknown as ContributorServiceDeps;
}

function makeDescriptor(
    loaded: { assignment: ContributorAssignmentDoc; planStatus: string } | null,
    overrides: Partial<ContributorModuleDescriptor<ContributorAssignmentDoc, unknown>> = {}
): ContributorModuleDescriptor<ContributorAssignmentDoc, unknown> {
    return {
        moduleName: "TEACHING_LEARNING",
        auditTableName: "teaching_learning_assignments",
        loadAssignment: vi.fn().mockResolvedValue(loaded),
        hydrateForSubmission: vi.fn().mockResolvedValue({}),
        submissionGate: vi.fn().mockReturnValue({ ok: true }),
        ...overrides,
    } as unknown as ContributorModuleDescriptor<ContributorAssignmentDoc, unknown>;
}

afterEach(() => vi.clearAllMocks());

describe("createContributorService.submit", () => {
    it("runs the recipe: gate -> transition -> save -> sync -> audit(SUBMIT)", async () => {
        const assignment = makeAssignment({ status: "Draft" });
        const deps = makeDeps({
            resolveWorkflowTransition: vi.fn().mockReturnValue({ status: "Submitted", completed: false }),
        });
        const descriptor = makeDescriptor({ assignment, planStatus: "Active" });
        const service = createContributorService(descriptor, deps);

        const result = await service.submit(actor, "assignment-1");

        expect(descriptor.hydrateForSubmission).toHaveBeenCalledTimes(1);
        expect(descriptor.submissionGate).toHaveBeenCalledTimes(1);
        expect(deps.resolveWorkflowTransition).toHaveBeenCalledWith(expect.anything(), "Draft", "submit");
        expect(assignment.status).toBe("Submitted");
        expect(assignment.save).toHaveBeenCalledTimes(1);
        expect(deps.syncWorkflowInstanceState).toHaveBeenCalledWith(
            expect.objectContaining({
                moduleName: "TEACHING_LEARNING",
                status: "Submitted",
                action: "submit",
                subjectDepartmentName: "Physics",
            })
        );
        expect(deps.createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({ action: "SUBMIT", tableName: "teaching_learning_assignments" })
        );
        expect(result).toBe(assignment);
    });

    it("throws 404 when the assignment is missing", async () => {
        const service = createContributorService(makeDescriptor(null), makeDeps());
        await expect(service.submit(actor, "missing")).rejects.toMatchObject({ status: 404 });
    });

    it("rejects a non-assignee (403)", async () => {
        const assignment = makeAssignment({ assigneeUserId: { toString: () => OTHER_ID } });
        const service = createContributorService(makeDescriptor({ assignment, planStatus: "Active" }), makeDeps());
        await expect(service.submit(actor, "a")).rejects.toMatchObject({ status: 403 });
    });

    it("rejects an inactive assignment (409)", async () => {
        const assignment = makeAssignment({ isActive: false });
        const service = createContributorService(makeDescriptor({ assignment, planStatus: "Active" }), makeDeps());
        await expect(service.submit(actor, "a")).rejects.toMatchObject({ status: 409 });
    });

    it("rejects a non-submittable status (409)", async () => {
        const assignment = makeAssignment({ status: "Under Review" });
        const service = createContributorService(makeDescriptor({ assignment, planStatus: "Active" }), makeDeps());
        await expect(service.submit(actor, "a")).rejects.toMatchObject({ status: 409 });
    });

    it("rejects when the plan is not active (400)", async () => {
        const assignment = makeAssignment();
        const service = createContributorService(makeDescriptor({ assignment, planStatus: "Archived" }), makeDeps());
        await expect(service.submit(actor, "a")).rejects.toMatchObject({ status: 400 });
    });

    it("surfaces the submission gate's reason (400) and does not save", async () => {
        const assignment = makeAssignment();
        const descriptor = makeDescriptor(
            { assignment, planStatus: "Active" },
            { submissionGate: vi.fn().mockReturnValue({ ok: false, reason: "Lesson plan is required." }) }
        );
        const service = createContributorService(descriptor, makeDeps());
        await expect(service.submit(actor, "a")).rejects.toMatchObject({
            message: "Lesson plan is required.",
            status: 400,
        });
        expect(assignment.save).not.toHaveBeenCalled();
    });
});

describe("createContributorService.review", () => {
    it("forwards at a review stage and audits REVIEW", async () => {
        const assignment = makeAssignment({
            status: "Submitted",
            assigneeUserId: { toString: () => OTHER_ID },
        });
        const deps = makeDeps({
            getWorkflowStageByStatus: vi.fn().mockReturnValue({ kind: "review", label: "Dept Head Review" }),
            resolveWorkflowTransition: vi.fn().mockReturnValue({ status: "Under Review", completed: false }),
        });
        const service = createContributorService(makeDescriptor({ assignment, planStatus: "Active" }), deps);

        await service.review(actor, "a", { decision: "Forward", remarks: "looks good" });

        expect(assignment.status).toBe("Under Review");
        expect(assignment.reviewHistory).toHaveLength(1);
        expect(assignment.reviewHistory[0]).toMatchObject({
            stage: "Dept Head Review",
            decision: "Forward",
            remarks: "looks good",
        });
        expect(deps.syncWorkflowInstanceState).toHaveBeenCalledWith(
            expect.objectContaining({ action: "approve" })
        );
        expect(deps.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "REVIEW" }));
    });

    it("blocks a contributor reviewing their own work (403)", async () => {
        const assignment = makeAssignment({
            status: "Submitted",
            assigneeUserId: { toString: () => ACTOR_ID },
        });
        const service = createContributorService(makeDescriptor({ assignment, planStatus: "Active" }), makeDeps());
        await expect(service.review(actor, "a", { decision: "Forward" })).rejects.toMatchObject({
            status: 403,
        });
    });

    it("allows an Admin to review their own work and approve at the final stage", async () => {
        const adminActor: ContributorActor = { ...actor, role: "Admin" };
        const assignment = makeAssignment({
            status: "Committee Review",
            assigneeUserId: { toString: () => ACTOR_ID },
        });
        const deps = makeDeps({
            getWorkflowStageByStatus: vi.fn().mockReturnValue({ kind: "final", label: "Principal Approval" }),
            resolveWorkflowTransition: vi.fn().mockReturnValue({ status: "Approved", completed: true }),
        });
        const service = createContributorService(makeDescriptor({ assignment, planStatus: "Active" }), deps);

        await service.review(adminActor, "a", { decision: "Approve" });

        expect(assignment.status).toBe("Approved");
        expect(assignment.approvedAt).toBeInstanceOf(Date);
        expect(assignment.approvedBy).toBeDefined();
    });

    it("throws 409 when the record is at no reviewable stage", async () => {
        const assignment = makeAssignment({
            status: "Approved",
            assigneeUserId: { toString: () => OTHER_ID },
        });
        const deps = makeDeps({ getWorkflowStageByStatus: vi.fn().mockReturnValue(null) });
        const service = createContributorService(makeDescriptor({ assignment, planStatus: "Active" }), deps);
        await expect(service.review(actor, "a", { decision: "Approve" })).rejects.toMatchObject({
            status: 409,
        });
    });

    it("throws 403 when the actor cannot process the stage", async () => {
        const assignment = makeAssignment({
            status: "Submitted",
            assigneeUserId: { toString: () => OTHER_ID },
        });
        const deps = makeDeps({ canActorProcessWorkflowStage: vi.fn().mockResolvedValue(false) });
        const service = createContributorService(makeDescriptor({ assignment, planStatus: "Active" }), deps);
        await expect(service.review(actor, "a", { decision: "Forward" })).rejects.toMatchObject({
            status: 403,
        });
    });

    it("rejects a decision that is invalid for the stage kind (400)", async () => {
        const assignment = makeAssignment({
            status: "Submitted",
            assigneeUserId: { toString: () => OTHER_ID },
        });
        const deps = makeDeps({
            getWorkflowStageByStatus: vi.fn().mockReturnValue({ kind: "review", label: "Dept Head Review" }),
        });
        const service = createContributorService(makeDescriptor({ assignment, planStatus: "Active" }), deps);
        // "Approve" is not permitted at an intermediate review stage.
        await expect(service.review(actor, "a", { decision: "Approve" })).rejects.toMatchObject({
            status: 400,
        });
        expect(deps.resolveWorkflowTransition).not.toHaveBeenCalled();
    });

    it("clears prior approval when a record is rejected", async () => {
        const assignment = makeAssignment({
            status: "Committee Review",
            assigneeUserId: { toString: () => OTHER_ID },
            approvedAt: new Date(),
            approvedBy: "someone",
        });
        const deps = makeDeps({
            getWorkflowStageByStatus: vi.fn().mockReturnValue({ kind: "final", label: "Principal Approval" }),
            resolveWorkflowTransition: vi.fn().mockReturnValue({ status: "Rejected", completed: true }),
        });
        const service = createContributorService(makeDescriptor({ assignment, planStatus: "Active" }), deps);

        await service.review(actor, "a", { decision: "Reject", remarks: "insufficient evidence" });

        expect(assignment.status).toBe("Rejected");
        expect(assignment.approvedAt).toBeUndefined();
        expect(assignment.approvedBy).toBeUndefined();
    });
});
