import { Building2, FlaskConical, GraduationCap, Sigma } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import type { PbasApp, PbasSummary } from "@/components/pbas/pbas-types";

/**
 * API score breakdown.
 *
 * The original rendered four unlabeled `StatTile`s in a `md:grid-cols-2
 * xl:grid-cols-4` grid — a bare number per category with no indication of the cap
 * it counted against, even though the server sends those caps in
 * `summary.scoringWeights.caps` and never used them in the UI. "Teaching 38" does
 * not tell a faculty member whether they are near the ceiling; "38 of 50" does.
 */
export function PBASScoreCalculator({
    score,
    caps,
}: {
    score: PbasApp["apiScore"];
    /** From `summary.scoringWeights.caps`. Omit to render plain totals. */
    caps?: PbasSummary["scoringWeights"]["caps"];
}) {
    const categories = [
        {
            label: "Teaching",
            value: score.teachingActivities,
            cap: caps?.teachingActivities,
            icon: GraduationCap,
            tone: "info" as const,
        },
        {
            label: "Research",
            value: score.researchAcademicContribution,
            cap: caps?.researchAcademicContribution,
            icon: FlaskConical,
            tone: "accent" as const,
        },
        {
            label: "Institutional",
            value: score.institutionalResponsibilities,
            cap: caps?.institutionalResponsibilities,
            icon: Building2,
            tone: "success" as const,
        },
    ];

    const totalCap = caps
        ? caps.teachingActivities + caps.researchAcademicContribution + caps.institutionalResponsibilities
        : undefined;

    return (
        <Card>
            <CardHeader>
                <CardTitle>API score</CardTitle>
                <CardDescription>
                    Calculated on the server from your selected records, and captured on every save.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {categories.map((category) => (
                        <StatCard
                            key={category.label}
                            label={category.label}
                            value={category.value}
                            helper={category.cap ? `of ${category.cap} maximum` : undefined}
                            icon={category.icon}
                            tone={category.tone}
                            dense
                        />
                    ))}
                    <StatCard
                        label="Total API"
                        value={score.totalScore}
                        helper={totalCap ? `of ${totalCap} maximum` : undefined}
                        icon={Sigma}
                        tone="neutral"
                        dense
                    />
                </div>

                {caps ? (
                    <ul className="space-y-3">
                        {categories.map((category) => {
                            const cap = category.cap ?? 0;
                            const percent = cap > 0 ? Math.min(100, (category.value / cap) * 100) : 0;

                            return (
                                <li key={category.label} className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2 text-sm">
                                        <span className="text-muted-foreground">{category.label}</span>
                                        <span className="font-medium tabular-nums text-foreground">
                                            {category.value} / {cap}
                                        </span>
                                    </div>
                                    <Progress
                                        value={percent}
                                        aria-label={`${category.label}: ${category.value} of ${cap}`}
                                    />
                                </li>
                            );
                        })}
                    </ul>
                ) : null}
            </CardContent>
        </Card>
    );
}
