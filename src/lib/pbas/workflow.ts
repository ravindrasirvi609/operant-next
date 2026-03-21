import type { PbasStatus } from "@/models/core/faculty-pbas-form";

const transitionMap: Record<PbasStatus, ReadonlyArray<PbasStatus>> = {
    Draft: ["Submitted"],
    Submitted: ["Under Review", "Rejected"],
    "Under Review": ["Committee Review", "Rejected"],
    "Committee Review": ["Approved", "Rejected"],
    Approved: [],
    Rejected: ["Draft", "Submitted"],
};

export function canTransitionPbasStatus(from: PbasStatus, to: PbasStatus) {
    return transitionMap[from].includes(to);
}

export function assertPbasTransition(
    from: PbasStatus,
    to: PbasStatus,
    options?: { actionLabel?: string }
) {
    if (canTransitionPbasStatus(from, to)) {
        return;
    }

    const context = options?.actionLabel ? ` during ${options.actionLabel}` : "";
    throw new Error(`Invalid PBAS status transition from ${from} to ${to}${context}.`);
}

export function deriveReviewTransition(currentStatus: PbasStatus, decision: "Forward" | "Recommend" | "Reject"): PbasStatus {
    if (decision === "Reject") {
        assertPbasTransition(currentStatus, "Rejected", { actionLabel: "review" });
        return "Rejected";
    }

    if (currentStatus === "Submitted") {
        assertPbasTransition("Submitted", "Under Review", { actionLabel: "review" });
        return "Under Review";
    }

    if (currentStatus === "Under Review") {
        assertPbasTransition("Under Review", "Committee Review", { actionLabel: "review" });
        return "Committee Review";
    }

    throw new Error(
        `Review decision ${decision} is not allowed while PBAS status is ${currentStatus}.`
    );
}
