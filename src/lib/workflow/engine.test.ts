import {
    getWorkflowPendingStatuses,
    getWorkflowStageByStatus,
    resolveWorkflowTransition,
} from "@/lib/workflow/engine";
import { makeWorkflowDefinition, makeWorkflowStage } from "@/test/factories";

// A fully-typed three-stage chain: Submitted -> Under Review -> Committee Review
// (final) -> Approved. Built via the factory so the fixture stays correctly
// typed against the model (no `as const` gymnastics) and lives in one place.
const definition = makeWorkflowDefinition();

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

    it("allows rejection at the very first stage", () => {
        expect(resolveWorkflowTransition(definition, "Submitted", "reject")).toEqual({
            action: "reject",
            status: "Rejected",
            stage: null,
            completed: true,
        });
    });

    it("walks every stage of a longer chain before completing", () => {
        // A four-stage chain (Board of Studies inserted), mirroring CURRICULUM.
        const longChain = makeWorkflowDefinition({
            stages: [
                makeWorkflowStage({ key: "hod", status: "Submitted" }),
                makeWorkflowStage({ key: "bos", status: "Board Review" }),
                makeWorkflowStage({ key: "iqac", status: "Under Review", scope: "global" }),
                makeWorkflowStage({
                    key: "final",
                    status: "Committee Review",
                    kind: "final",
                    scope: "global",
                }),
            ],
        });

        expect(resolveWorkflowTransition(longChain, "Board Review", "approve").status).toBe(
            "Under Review"
        );
        expect(resolveWorkflowTransition(longChain, "Under Review", "approve").status).toBe(
            "Committee Review"
        );
        expect(resolveWorkflowTransition(longChain, "Committee Review", "approve")).toEqual({
            action: "approve",
            status: "Approved",
            stage: null,
            completed: true,
        });
    });
});

describe("workflow engine transition guards", () => {
    it("throws when submitting from a non-draft, non-rejected status", () => {
        expect(() => resolveWorkflowTransition(definition, "Under Review", "submit")).toThrow(
            "Workflow submit is not allowed while status is Under Review."
        );
    });

    it("throws when approving from a status that maps to no stage", () => {
        expect(() => resolveWorkflowTransition(definition, "Approved", "approve")).toThrow(
            "Workflow action approve is not allowed while status is Approved."
        );
    });

    it("throws when a submittable definition has no stages", () => {
        const emptyChain = makeWorkflowDefinition({ stages: [] });
        expect(() => resolveWorkflowTransition(emptyChain, "Draft", "submit")).toThrow(
            "Workflow definition must include at least one stage."
        );
    });
});

describe("workflow engine metadata", () => {
    it("returns the pending statuses in definition order", () => {
        expect(getWorkflowPendingStatuses(definition)).toEqual([
            "Submitted",
            "Under Review",
            "Committee Review",
        ]);
    });

    it("resolves the current stage by status", () => {
        expect(getWorkflowStageByStatus(definition, "Under Review")).toEqual(definition.stages[1]);
    });

    it("returns null for a status that matches no stage", () => {
        expect(getWorkflowStageByStatus(definition, "Approved")).toBeNull();
    });
});
