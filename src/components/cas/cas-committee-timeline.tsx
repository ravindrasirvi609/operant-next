"use client";

import { StatusTimeline, type TimelineEntry } from "@/components/workspace/status-timeline";
import type { CasApp } from "@/components/cas/cas-types";

/**
 * Committee decisions, rendered through the shared timeline.
 *
 * This was a fourth copy of the status-timeline markup with different field names:
 * `stage` where the others had `status`, `committeeMemberName` for `actorName`,
 * `reviewerRole ?? role` for `actorRole`, and `decisionDate ?? createdAt` for
 * `changedAt`. Mapping those four fields is the whole component now.
 *
 * The original also called `new Date(review.decisionDate ?? review.createdAt ?? Date.now())`
 * — falling back to *now* for a review with no recorded date, which silently
 * stamped an undated committee decision with the time the page happened to render.
 * `formatTimestamp` renders a dash instead.
 */
export function CASCommitteeTimeline({
    reviews,
}: {
    reviews: NonNullable<CasApp["committeeReviews"]>;
}) {
    const entries: TimelineEntry[] = reviews.map((review) => ({
        id: review._id,
        // The stage is what happened; the decision is the outcome. `StatusTimeline`
        // derives its tone from `status`, so the decision drives the colour when
        // one was recorded.
        status: review.decision ?? review.stage,
        actorName: review.committeeMemberName,
        actorRole: [review.reviewerRole ?? review.role, review.designation].filter(Boolean).join(" · "),
        remarks: review.remarks
            ? `${review.stage}: ${review.remarks}`
            : `Stage: ${review.stage}`,
        changedAt: review.decisionDate ?? review.createdAt,
    }));

    return (
        <StatusTimeline
            entries={entries}
            emptyTitle="No committee reviews yet"
            emptyDescription="Department, committee, and principal decisions appear here as they are recorded."
        />
    );
}
