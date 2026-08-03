"use client";

import { ReviewBoard, type ReviewMode, type ReviewRecord } from "@/components/workspace/review-board";

/**
 * AQAR approval queue.
 *
 * This was 212 lines that differed from `cas-review-board.tsx` in only 154 —
 * every one of them a record field, an endpoint prefix, or a label. The state
 * machine, the search, the actionable/history/all tabs, and the
 * `status === "Submitted" ? "Forward" : "Recommend"` decision split all now live
 * in `components/workspace/review-board.tsx`.
 */

type AqarReviewApplication = ReviewRecord & {
    academicYear: string;
    metrics: { totalContributionIndex: number };
};

export function AqarReviewBoard({
    applications,
    mode,
}: {
    applications: AqarReviewApplication[];
    mode: ReviewMode;
}) {
    return (
        <ReviewBoard<AqarReviewApplication>
            records={applications}
            mode={mode}
            config={{
                noun: "AQAR",
                endpointBase: "/api/aqar",
                description:
                    "Faculty AQAR contributions awaiting an IQAC or principal decision, alongside your scoped history.",
                searchPlaceholder: "Faculty, year, or status",
                searchValues: (record) => [record.facultyName, record.academicYear, record.status],
                cardTitle: (record) => record.facultyName ?? "Faculty AQAR contribution",
                cardSubtitle: (record) => record.academicYear,
                stats: (record) => [
                    {
                        label: "Contribution index",
                        value: record.metrics.totalContributionIndex,
                        helper: "Weighted across all AQAR sections",
                    },
                    { label: "Academic year", value: record.academicYear },
                ],
            }}
        />
    );
}
