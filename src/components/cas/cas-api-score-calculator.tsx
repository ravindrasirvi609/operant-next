"use client";

import { Award, BookOpen, GraduationCap, Sigma } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CasApp } from "@/components/cas/cas-types";

/**
 * CAS score breakdown and eligibility verdict.
 *
 * The eligibility banner previously carried its own conditional class string
 * (`eligibility.isEligible ? "border-success-border bg-success-muted …" : "…"`)
 * inside a `md:col-span-2 xl:col-span-4` grid cell — a full-width block wedged
 * into a stat grid, which meant it inherited the grid's gap and sat flush against
 * the tiles. It is an `InlineAlert` now, outside the grid.
 *
 * The category breakup table became a list for the same reason as the others: four
 * columns inside a card inside the old narrow column did not fit, and `<Table>`
 * does not reflow.
 */
export function APIScoreCalculator({
    score,
    eligibility,
    breakup,
}: {
    score: {
        teachingLearning: number;
        researchPublication: number;
        academicContribution: number;
        totalScore: number;
    };
    eligibility: {
        isEligible: boolean;
        message?: string;
        minimumExperienceYears?: number;
        minimumApiScore?: number;
    };
    breakup?: CasApp["apiBreakup"];
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>CAS API score</CardTitle>
                <CardDescription>
                    Calculated on the server from your linked PBAS reports and added achievements.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Teaching and learning"
                        value={score.teachingLearning}
                        icon={GraduationCap}
                        tone="info"
                        dense
                    />
                    <StatCard
                        label="Research publications"
                        value={score.researchPublication}
                        icon={BookOpen}
                        tone="accent"
                        dense
                    />
                    <StatCard
                        label="Academic contribution"
                        value={score.academicContribution}
                        icon={Award}
                        tone="success"
                        dense
                    />
                    <StatCard
                        label="Total API"
                        value={score.totalScore}
                        helper={
                            eligibility.minimumApiScore
                                ? `${eligibility.minimumApiScore} required`
                                : undefined
                        }
                        icon={Sigma}
                        tone="neutral"
                        dense
                    />
                </div>

                <InlineAlert
                    tone={eligibility.isEligible ? "success" : "warning"}
                    title={eligibility.isEligible ? "Eligible for promotion" : "Not yet eligible"}
                >
                    {eligibility.message ??
                        "Eligibility is recalculated on the server each time the draft is saved."}
                </InlineAlert>

                {breakup?.length ? (
                    <div>
                        <h4 className="mb-2 text-sm font-semibold text-foreground">Category thresholds</h4>
                        <ul className="divide-y rounded-lg border">
                            {breakup.map((entry) => (
                                <li
                                    key={entry._id ?? entry.categoryCode}
                                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                                >
                                    <span className="min-w-0 text-sm font-medium text-foreground">
                                        {entry.categoryCode}
                                    </span>
                                    <span className="flex items-center gap-3">
                                        <span className="text-sm tabular-nums text-muted-foreground">
                                            {entry.scoreObtained} / {entry.minimumRequired}
                                        </span>
                                        <StatusBadge
                                            status={entry.eligible ? "Approved" : "Pending"}
                                            label={entry.eligible ? "Met" : "Below minimum"}
                                        />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
