"use client";

import { ReviewBoard, type ReviewMode, type ReviewRecord } from "@/components/workspace/review-board";

/**
 * CAS promotion approval queue. See `components/workspace/review-board.tsx` for
 * the shared behaviour this used to duplicate.
 */

type CasReviewApplication = ReviewRecord & {
    applicationYear: string;
    currentDesignation: string;
    applyingForDesignation: string;
    apiScore: { totalScore: number };
    experienceYears: number;
};

export function CasReviewBoard({
    applications,
    mode,
}: {
    applications: CasReviewApplication[];
    mode: ReviewMode;
}) {
    return (
        <ReviewBoard<CasReviewApplication>
            records={applications}
            mode={mode}
            config={{
                noun: "CAS",
                endpointBase: "/api/cas",
                description:
                    "Promotion applications awaiting a decision, alongside read-only scoped history.",
                searchPlaceholder: "Faculty, designation, year, or status",
                searchValues: (record) => [
                    record.facultyName,
                    record.currentDesignation,
                    record.applyingForDesignation,
                    record.applicationYear,
                    record.status,
                ],
                cardTitle: (record) => record.facultyName ?? "Faculty CAS application",
                // The promotion being applied for is the point of the record, so it
                // belongs in the subtitle rather than buried in a stat tile.
                cardSubtitle: (record) =>
                    `${record.currentDesignation} → ${record.applyingForDesignation} · ${record.applicationYear}`,
                stats: (record) => [
                    { label: "Total API", value: record.apiScore.totalScore },
                    { label: "Experience", value: `${record.experienceYears} years` },
                    { label: "Application year", value: record.applicationYear },
                ],
            }}
        />
    );
}
