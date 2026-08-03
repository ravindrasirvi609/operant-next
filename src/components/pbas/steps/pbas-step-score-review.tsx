import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PBASScoreCalculator } from "@/components/pbas/pbas-score-calculator";
import { PbasIndicatorTotalsTable } from "@/components/pbas/pbas-indicator-totals-table";
import { PbasRevisionHistory } from "@/components/pbas/pbas-revision-history";
import type { IndicatorEntry, PbasApp, PbasRevisionSummary } from "@/components/pbas/pbas-types";

export function PbasStepScoreReview({
    score,
    entries,
    entryLoading,
    entryError,
    canEdit,
    facultyId,
    onUploadEvidence,
    revisionHistory,
    selectedId,
    isPending,
    onSubmit,
    submitDisabledReason,
}: {
    score: PbasApp["apiScore"];
    entries: IndicatorEntry[];
    entryLoading: boolean;
    entryError: string | null;
    canEdit: boolean;
    facultyId: string;
    onUploadEvidence: (indicatorId: string, documentId: string) => void;
    revisionHistory: PbasRevisionSummary[];
    selectedId: string | null;
    isPending: boolean;
    onSubmit: () => void;
    submitDisabledReason: string | null;
}) {
    return (
        <div className="space-y-6">
            <PBASScoreCalculator score={score} />
            <Separator />

            <Card>
                <CardHeader>
                    <CardTitle>PBAS Indicator Totals</CardTitle>
                    <CardDescription>
                        Evidence-linked indicator totals for the selected PBAS form.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <PbasIndicatorTotalsTable
                        entries={entries}
                        loading={entryLoading}
                        error={entryError}
                        canEdit={canEdit}
                        facultyId={facultyId}
                        onUploadEvidence={onUploadEvidence}
                    />
                </CardContent>
            </Card>

            <PbasRevisionHistory revisions={revisionHistory} />

            <div className="flex flex-wrap gap-3">
                {selectedId ? (
                    <Button asChild type="button" variant="secondary">
                        <a href={`/api/pbas/${selectedId}/report`}>Download PBAS PDF</a>
                    </Button>
                ) : null}
                <Button
                    loading={isPending}
                    type="button"
                    onClick={onSubmit}
                    disabled={isPending || !selectedId || !canEdit}
                >
                    Submit PBAS Application
                </Button>
            </div>
            {submitDisabledReason ? (
                <p className="text-sm text-warning-muted-foreground">{submitDisabledReason}</p>
            ) : null}
        </div>
    );
}
