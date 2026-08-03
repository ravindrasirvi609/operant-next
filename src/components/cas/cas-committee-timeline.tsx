"use client";

import { Badge } from "@/components/ui/badge";
import type { CasApp } from "@/components/cas/cas-types";

export function CASCommitteeTimeline({
    reviews,
}: {
    reviews: NonNullable<CasApp["committeeReviews"]>;
}) {
    return (
        <div className="grid gap-3">
            {reviews.length ? reviews.map((review) => (
                <div className="rounded-lg border border-border bg-muted/50 p-4" key={review._id ?? `${review.stage}-${review.createdAt}`}>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="font-semibold text-foreground">{review.stage}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {review.committeeMemberName} ({review.reviewerRole ?? review.role})
                            </p>
                        </div>
                        <Badge>{review.decision ?? "Recorded"}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{review.designation}</p>
                    {review.remarks ? <p className="mt-2 text-sm text-muted-foreground">{review.remarks}</p> : null}
                    <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        {new Date(review.decisionDate ?? review.createdAt ?? Date.now()).toLocaleString()}
                    </p>
                </div>
            )) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
                    No committee reviews recorded yet.
                </div>
            )}
        </div>
    );
}
