import { describe, expect, it } from "vitest";

import {
    assertPbasTransition,
    canTransitionPbasStatus,
    deriveReviewTransition,
} from "@/lib/pbas/workflow";

describe("PBAS workflow transitions", () => {
    it("allows valid forward transitions", () => {
        expect(canTransitionPbasStatus("Draft", "Submitted")).toBe(true);
        expect(canTransitionPbasStatus("Submitted", "Under Review")).toBe(true);
        expect(canTransitionPbasStatus("Under Review", "Committee Review")).toBe(true);
        expect(canTransitionPbasStatus("Committee Review", "Approved")).toBe(true);
    });

    it("rejects invalid transitions", () => {
        expect(canTransitionPbasStatus("Submitted", "Approved")).toBe(false);
        expect(canTransitionPbasStatus("Approved", "Draft")).toBe(false);
    });

    it("throws with clear error for invalid transitions", () => {
        expect(() => assertPbasTransition("Approved", "Submitted", { actionLabel: "submit" })).toThrow(
            "Invalid PBAS status transition"
        );
    });
});

describe("PBAS review transition derivation", () => {
    it("derives Submitted + Recommend to Under Review", () => {
        expect(deriveReviewTransition("Submitted", "Recommend")).toBe("Under Review");
    });

    it("derives Under Review + Forward to Committee Review", () => {
        expect(deriveReviewTransition("Under Review", "Forward")).toBe("Committee Review");
    });

    it("derives reject decisions to Rejected when allowed", () => {
        expect(deriveReviewTransition("Submitted", "Reject")).toBe("Rejected");
        expect(deriveReviewTransition("Committee Review", "Reject")).toBe("Rejected");
    });

    it("rejects review forward from Committee Review", () => {
        expect(() => deriveReviewTransition("Committee Review", "Recommend")).toThrow(
            "not allowed"
        );
    });
});
