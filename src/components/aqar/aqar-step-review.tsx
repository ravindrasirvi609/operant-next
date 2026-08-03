"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailList } from "@/components/workspace/detail-list";
import { reviewChecklistItems } from "@/lib/aqar/form-config";
import type { AqarMetrics, AqarSectionReadiness } from "@/lib/aqar/metrics";
import { formatDateRange } from "@/lib/ui/dates";

/**
 * Final AQAR step: counts, readiness, and the submission checklist.
 *
 * The Submit button and the PDF link moved out of this step's body — Submit is
 * now the wizard's own final action, so it is reachable from the pinned action bar
 * rather than sitting below two cards of content. The checklist stays here
 * because it gates submission and the user must read it.
 *
 * The readiness list previously rendered its own `<Badge>` with hardcoded
 * `bg-success-muted` / `bg-warning-muted` classes; it uses `StatusBadge` now, so
 * the Ready/Attention states carry an icon and match every other status in the app.
 */
export function AqarStepReview({
    metrics,
    readiness,
    academicYear,
    reportingPeriod,
    checks,
    onCheckChange,
    onJumpToStep,
    editable,
    selectedId,
}: {
    metrics: AqarMetrics;
    readiness: AqarSectionReadiness[];
    academicYear?: string;
    reportingPeriod: { fromDate?: string; toDate?: string };
    checks: boolean[];
    onCheckChange: (index: number, value: boolean) => void;
    /** Lets an "Attention" row link back to the step that owns it. */
    onJumpToStep: (stepId: string) => void;
    editable: boolean;
    selectedId: string | null;
}) {
    const incomplete = readiness.filter((section) => section.count === 0);

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Review and submit"
                description="Confirm the record counts, then complete the checklist to enable submission."
                actions={
                    selectedId ? (
                        <Button asChild type="button" variant="outline" size="sm">
                            <a href={`/api/aqar/${selectedId}/report`}>
                                <Download aria-hidden />
                                Download PDF
                            </a>
                        </Button>
                    ) : null
                }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Contribution index"
                    value={metrics.totalContributionIndex}
                    helper="Weighted across all sections"
                    tone="accent"
                    dense
                />
                <StatCard label="Research papers" value={metrics.researchPaperCount} dense tone="info" />
                <StatCard
                    label="Patents and PhD"
                    value={metrics.patentCount + metrics.phdAwardCount}
                    dense
                    tone="success"
                />
                <StatCard
                    label="Books and outreach"
                    value={
                        metrics.bookChapterCount +
                        metrics.eContentCount +
                        metrics.consultancyCount +
                        metrics.financialSupportCount +
                        metrics.fdpCount
                    }
                    dense
                    tone="neutral"
                />
            </div>

            <DetailList
                items={[
                    { label: "Academic year", value: academicYear },
                    {
                        label: "Reporting period",
                        value: formatDateRange(reportingPeriod.fromDate, reportingPeriod.toDate),
                    },
                ]}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Section readiness</CardTitle>
                    <CardDescription>
                        Empty sections do not block submission, but they will read as gaps in the NAAC report.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {readiness.map((section) => (
                        <div
                            key={section.stepId}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2.5"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{section.label}</p>
                                <p className="text-xs text-muted-foreground">
                                    {section.count
                                        ? `${section.count} record${section.count === 1 ? "" : "s"}`
                                        : "No records added yet"}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <StatusBadge
                                    status={section.count ? "Ready" : "Pending"}
                                    label={section.count ? "Ready" : "Attention"}
                                />
                                {section.count ? null : (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onJumpToStep(section.stepId)}
                                    >
                                        Add records
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {incomplete.length ? (
                <InlineAlert tone="warning" title={`${incomplete.length} section(s) have no records`}>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                        {incomplete.map((section) => (
                            <li key={section.stepId}>{section.label}</li>
                        ))}
                    </ul>
                </InlineAlert>
            ) : (
                <InlineAlert tone="success" title="All sections have at least one record" />
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Submission checklist</CardTitle>
                    <CardDescription>All three must be confirmed before you can submit.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {reviewChecklistItems.map((item, index) => {
                        const id = `aqar-check-${index}`;

                        return (
                            <div key={item} className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
                                <Checkbox
                                    id={id}
                                    checked={checks[index] ?? false}
                                    disabled={!editable}
                                    onCheckedChange={(checked) => onCheckChange(index, checked === true)}
                                />
                                {/* The original wrapped the checkbox in a bare
                                    <label> with no htmlFor and no id, so the text
                                    was not programmatically associated with it. */}
                                <Label htmlFor={id} className="leading-snug font-normal">
                                    {item}
                                </Label>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
