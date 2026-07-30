import {
    contributorReviewSchema,
    reviewDecisionToAction,
    validateReviewDecisionForStage,
} from "@/lib/contributor-kernel/review";

describe("reviewDecisionToAction", () => {
    it("maps Reject to the reject action", () => {
        expect(reviewDecisionToAction("Reject")).toBe("reject");
    });

    it("maps every advancing decision to approve", () => {
        expect(reviewDecisionToAction("Forward")).toBe("approve");
        expect(reviewDecisionToAction("Recommend")).toBe("approve");
        expect(reviewDecisionToAction("Approve")).toBe("approve");
    });
});

describe("validateReviewDecisionForStage", () => {
    it("allows Forward/Recommend/Reject at review stages", () => {
        expect(validateReviewDecisionForStage("review", "Forward")).toBeNull();
        expect(validateReviewDecisionForStage("review", "Recommend")).toBeNull();
        expect(validateReviewDecisionForStage("review", "Reject")).toBeNull();
    });

    it("rejects Approve at a review stage", () => {
        expect(validateReviewDecisionForStage("review", "Approve")).toBe(
            "Use Forward, Recommend, or Reject during review stages."
        );
    });

    it("allows Approve/Reject at the final stage", () => {
        expect(validateReviewDecisionForStage("final", "Approve")).toBeNull();
        expect(validateReviewDecisionForStage("final", "Reject")).toBeNull();
    });

    it("rejects Forward/Recommend at the final stage", () => {
        expect(validateReviewDecisionForStage("final", "Forward")).toBe(
            "Use Approve or Reject during final approval."
        );
        expect(validateReviewDecisionForStage("final", "Recommend")).toBe(
            "Use Approve or Reject during final approval."
        );
    });
});

describe("contributorReviewSchema", () => {
    it("accepts a valid decision with optional remarks", () => {
        expect(contributorReviewSchema.parse({ decision: "Forward" }).decision).toBe("Forward");
        expect(
            contributorReviewSchema.parse({ decision: "Reject", remarks: "  needs work  " }).remarks
        ).toBe("needs work");
    });

    it("rejects an unknown decision", () => {
        expect(contributorReviewSchema.safeParse({ decision: "Maybe" }).success).toBe(false);
    });
});
