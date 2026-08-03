"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { DetailList } from "@/components/workspace/detail-list";
import { PBASScoreCalculator } from "@/components/pbas/pbas-score-calculator";
import { PbasIndicatorTotalsTable } from "@/components/pbas/pbas-indicator-totals-table";
import { PbasRevisionHistory } from "@/components/pbas/pbas-revision-history";
import { PbasSourceGroup, PbasSourceLoadingSkeleton } from "@/components/pbas/pbas-source-table";
import { pbasSourceSteps } from "@/lib/pbas/source-config";
import { formatDateRange, formatTimestamp } from "@/lib/ui/dates";
import type { PbasSnapshot } from "@/lib/pbas/validators";
import type {
    IndicatorEntry,
    PbasApp,
    PbasRevisionSummary,
    PbasSourceTables,
    PbasSummary,
} from "@/components/pbas/pbas-types";

/**
 * Read-only record, shown instead of the wizard once the application leaves
 * Draft/Rejected.
 *
 * The status badge and the timeline both moved out: the badge is in the workspace
 * header (where it applies to the whole view) and the timeline is in the rail. The
 * original rendered both here *and* in the sidebar simultaneously, so a submitted
 * PBAS form showed its status twice and its full timeline twice on one screen.
 */
export function PbasSubmissionSummary({
    application,
    submittedAt,
    sourceTables,
    sourcesLoading,
    sourcesError,
    snapshot,
    caps,
    entries,
    entryLoading,
    entryError,
    revisionHistory,
}: {
    application: PbasApp;
    submittedAt?: string;
    sourceTables: PbasSourceTables | null;
    sourcesLoading: boolean;
    sourcesError: string | null;
    snapshot: PbasSnapshot;
    caps?: PbasSummary["scoringWeights"]["caps"];
    entries: IndicatorEntry[];
    entryLoading: boolean;
    entryError: string | null;
    revisionHistory: PbasRevisionSummary[];
}) {
    return (
        <div className="space-y-6">
            <SectionHeader
                title="Submission record"
                description="This application is locked while it moves through review."
                actions={
                    <Button asChild type="button" variant="outline" size="sm">
                        <a href={`/api/pbas/${application._id}/report`}>
                            <Download aria-hidden />
                            Download PDF
                        </a>
                    </Button>
                }
            />

            <DetailList
                columns={2}
                items={[
                    { label: "Academic year", value: application.academicYear },
                    { label: "Designation", value: application.currentDesignation },
                    {
                        label: "Appraisal period",
                        value: formatDateRange(
                            application.appraisalPeriod.fromDate,
                            application.appraisalPeriod.toDate
                        ),
                    },
                    { label: "Submitted", value: formatTimestamp(submittedAt) },
                    { label: "Last updated", value: formatTimestamp(application.updatedAt), wide: true },
                ]}
            />

            <PBASScoreCalculator score={application.apiScore} caps={caps} />

            {pbasSourceSteps.map((step) => (
                <Card key={step.key}>
                    <CardHeader>
                        <CardTitle>{step.snapshotTitle}</CardTitle>
                        <CardDescription>{step.descriptionFor("default")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                            {step.snapshotTiles(snapshot).map((tile) => (
                                <StatTile key={tile.label} label={tile.label} value={tile.value} />
                            ))}
                        </div>

                        {sourcesLoading ? (
                            <PbasSourceLoadingSkeleton />
                        ) : sourcesError ? (
                            <InlineAlert message={{ type: "error", text: sourcesError }} />
                        ) : sourceTables ? (
                            <div className="space-y-3">
                                {sourceTables[step.key].groups
                                    // Excluded records are noise in a read-only
                                    // record; the original listed every candidate,
                                    // included or not, across all nineteen groups.
                                    .map((group) => ({
                                        ...group,
                                        rows: group.rows.filter((row) => row.included),
                                    }))
                                    .filter((group) => group.rows.length > 0)
                                    .map((group) => (
                                        <PbasSourceGroup
                                            key={`${step.key}-${group.title}`}
                                            title={group.title}
                                            rows={group.rows}
                                            canEdit={false}
                                            onToggle={() => undefined}
                                            readOnly
                                        />
                                    ))}
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            ))}

            <Card>
                <CardHeader>
                    <CardTitle>Indicator totals</CardTitle>
                    <CardDescription>Evidence-linked totals as submitted.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PbasIndicatorTotalsTable
                        entries={entries}
                        loading={entryLoading}
                        error={entryError}
                        canEdit={false}
                    />
                </CardContent>
            </Card>

            <PbasRevisionHistory revisions={revisionHistory} />
        </div>
    );
}
