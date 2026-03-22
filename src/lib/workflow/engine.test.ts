import {
    getWorkflowPendingStatuses,
    getWorkflowStageByStatus,
    resolveWorkflowTransition,
} from "@/lib/workflow/engine";

const definition = {
    draftStatus: "Draft",
    approvedStatus: "Approved",
    rejectedStatus: "Rejected",
    stages: [
        {
            key: "department_head_review",
            label: "Department Head Review",
            status: "Submitted",
            kind: "review" as const,
            scope: "department" as const,
            approverRoles: ["DEPARTMENT_HEAD", "DIRECTOR"] as const,
        },
        {
            key: "committee_review",
            label: "Committee Review",
            status: "Under Review",
            kind: "review" as const,
            scope: "global" as const,
            approverRoles: ["DIRECTOR"] as const,
        },
        {
            key: "final_approval",
            label: "Principal Approval",
            status: "Committee Review",
            kind: "final" as const,
            scope: "global" as const,
            approverRoles: ["ADMIN"] as const,
        },
    ],
};

describe("workflow engine transitions", () => {
    it("starts at the first configured stage on submit", () => {
        expect(resolveWorkflowTransition(definition, "Draft", "submit")).toEqual({
            action: "submit",
            status: "Submitted",
            stage: definition.stages[0],
            completed: false,
        });
    });

    it("moves to the next configured stage on approve", () => {
        expect(resolveWorkflowTransition(definition, "Submitted", "approve")).toEqual({
            action: "approve",
            status: "Under Review",
            stage: definition.stages[1],
            completed: false,
        });
    });

    it("completes the workflow on final-stage approval", () => {
        expect(resolveWorkflowTransition(definition, "Committee Review", "approve")).toEqual({
            action: "approve",
            status: "Approved",
            stage: null,
            completed: true,
        });
    });

    it("routes rejects to the configured rejected status", () => {
        expect(resolveWorkflowTransition(definition, "Under Review", "reject")).toEqual({
            action: "reject",
            status: "Rejected",
            stage: null,
            completed: true,
        });
    });

    it("supports resubmission from rejected state", () => {
        expect(resolveWorkflowTransition(definition, "Rejected", "submit")).toEqual({
            action: "submit",
            status: "Submitted",
            stage: definition.stages[0],
            completed: false,
        });
    });
});

describe("workflow engine metadata", () => {
    it("returns the pending statuses from definition order", () => {
        expect(getWorkflowPendingStatuses(definition)).toEqual([
            "Submitted",
            "Under Review",
            "Committee Review",
        ]);
    });

    it("resolves the current stage by status", () => {
        expect(getWorkflowStageByStatus(definition, "Under Review")).toEqual(
            definition.stages[1]
        );
    });
});
