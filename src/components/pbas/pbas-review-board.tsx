"use client";

import { PbasIndicatorModeration } from "@/components/pbas/pbas-indicator-moderation";
import { ReviewBoard, type ReviewMode, type ReviewRecord } from "@/components/workspace/review-board";

/**
 * PBAS approval queue.
 *
 * Was the same 212-line skeleton as the AQAR and CAS boards, plus ~180 lines of
 * indicator moderation and the five `Record<string, …>` state maps that panel
 * needed. The skeleton is now `components/workspace/review-board.tsx` and the
 * panel is `PbasIndicatorModeration`, which owns its own state because it mounts
 * per expanded row.
 */

type PbasReviewApplication = ReviewRecord & {
    academicYear: string;
    currentDesignation: string;
    apiScore: { totalScore: number };
};

export function PbasReviewBoard({
    applications,
    mode,
}: {
    applications: PbasReviewApplication[];
    mode: ReviewMode;
}) {
    return (
        <ReviewBoard<PbasReviewApplication>
            records={applications}
            mode={mode}
            config={{
                noun: "PBAS",
                endpointBase: "/api/pbas",
                description:
                    "Annual appraisals awaiting a decision, alongside read-only scoped history.",
                searchPlaceholder: "Faculty, designation, year, or status",
                searchValues: (record) => [
                    record.facultyName,
                    record.currentDesignation,
                    record.academicYear,
                    record.status,
                ],
                cardTitle: (record) => record.facultyName ?? "Faculty PBAS appraisal",
                cardSubtitle: (record) => `${record.currentDesignation} · ${record.academicYear}`,
                stats: (record) => [
                    { label: "Total API", value: record.apiScore.totalScore },
                    { label: "Academic year", value: record.academicYear },
                ],
                expansion: {
                    label: "Moderate indicator scores",
                    render: (record) => <PbasIndicatorModeration applicationId={record._id} />,
                },
            }}
        />
    );
}
