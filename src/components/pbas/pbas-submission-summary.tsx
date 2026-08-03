import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PBASScoreCalculator } from "@/components/pbas/pbas-score-calculator";
import { PBASStatusTimeline } from "@/components/pbas/pbas-status-timeline";
import { PbasIndicatorTotalsTable } from "@/components/pbas/pbas-indicator-totals-table";
import { PbasRevisionHistory } from "@/components/pbas/pbas-revision-history";
import { ReadonlySourceTable } from "@/components/pbas/pbas-source-table";
import { TeachingSnapshotCard } from "@/components/pbas/steps/pbas-step-teaching-sources";
import { ResearchSnapshotCard } from "@/components/pbas/steps/pbas-step-research-sources";
import { InstitutionalSnapshotCard } from "@/components/pbas/steps/pbas-step-institutional-sources";
import type { PbasSnapshot } from "@/lib/pbas/validators";
import type { IndicatorEntry, PbasApp, PbasRevisionSummary, PbasSourceTables } from "@/components/pbas/pbas-types";

/**
 * Read-only "submission record" view rendered instead of the Stepper+form
 * whenever the application can no longer be edited (any status other than
 * Draft/Rejected).
 */
export function PbasSubmissionSummary({
    application,
    submittedAt,
    sourceTables,
    sourcesLoading,
    sourcesError,
    snapshot,
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
    entries: IndicatorEntry[];
    entryLoading: boolean;
    entryError: string | null;
    revisionHistory: PbasRevisionSummary[];
}) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <CardTitle>PBAS Submission Record</CardTitle>
                            <Badge variant="secondary">{application.status}</Badge>
                        </div>
                        <CardDescription>
                            {submittedAt
                                ? `Submitted ${new Date(submittedAt).toLocaleString()}`
                                : "Submission date unavailable"}
                            {" • "}
                            Last updated {new Date(application.updatedAt).toLocaleString()}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Academic Year</p>
                        <p className="mt-2 font-semibold text-foreground">{application.academicYear}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Designation</p>
                        <p className="mt-2 font-semibold text-foreground">{application.currentDesignation}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Appraisal Period</p>
                        <p className="mt-2 font-semibold text-foreground">
                            {application.appraisalPeriod.fromDate} — {application.appraisalPeriod.toDate}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <PBASScoreCalculator score={application.apiScore} />
            <Separator />

            <div className="grid gap-4 lg:grid-cols-3">
                <TeachingSnapshotCard snapshot={snapshot.category1} />
                <ResearchSnapshotCard snapshot={snapshot.category2} />
                <InstitutionalSnapshotCard snapshot={snapshot.category3} />
            </div>

            {sourcesLoading ? null : sourcesError ? (
                <div className="rounded-lg border border-destructive-border bg-destructive-muted p-4 text-sm text-destructive-muted-foreground">
                    {sourcesError}
                </div>
            ) : sourceTables ? (
                <div className="space-y-4">
                    {(["teaching", "research", "institutional"] as const).map((stepKey) => (
                        <div key={stepKey} className="grid gap-4">
                            {sourceTables[stepKey].groups.map((group) => (
                                <ReadonlySourceTable
                                    key={`${stepKey}-${group.title}`}
                                    title={group.title}
                                    rows={group.rows}
                                    canEdit={false}
                                    onRemove={() => undefined}
                                    readOnly
                                />
                            ))}
                        </div>
                    ))}
                </div>
            ) : null}

            <Card>
                <CardHeader>
                    <CardTitle>PBAS Indicator Totals</CardTitle>
                    <CardDescription>
                        Evidence-linked indicator totals for the submitted PBAS form.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <PbasIndicatorTotalsTable
                        entries={entries}
                        loading={entryLoading}
                        error={entryError}
                        canEdit={false}
                    />
                </CardContent>
            </Card>

            <PbasRevisionHistory revisions={revisionHistory} />

            <Card>
                <CardHeader>
                    <CardTitle>Status Timeline</CardTitle>
                    <CardDescription>Every PBAS status transition is logged here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PBASStatusTimeline logs={application.statusLogs} />
                </CardContent>
            </Card>
        </div>
    );
}
