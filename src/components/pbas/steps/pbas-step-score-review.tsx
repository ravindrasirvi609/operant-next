"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { SectionHeader } from "@/components/ui/page-header";
import { PBASScoreCalculator } from "@/components/pbas/pbas-score-calculator";
import { PbasIndicatorTotalsTable } from "@/components/pbas/pbas-indicator-totals-table";
import { PbasRevisionHistory } from "@/components/pbas/pbas-revision-history";
import type { IndicatorEntry, PbasApp, PbasRevisionSummary, PbasSummary } from "@/components/pbas/pbas-types";

/**
 * Final wizard step: score, evidence, and the download link.
 *
 * The Submit button moved out of here and into the wizard's own action bar. It
 * previously sat at the bottom of this step's content, below the indicator table
 * and the revision list, and was also rendered *alongside* the step navigation —
 * two competing primary actions in one view. The "why is submit disabled"
 * explanation was a bare `<p>` printed underneath it, which is now attached to
 * the button through the wizard so it is visible without scrolling.
 */
export function PbasStepScoreReview({
    score,
    caps,
    entries,
    entryLoading,
    entryError,
    canEdit,
    facultyId,
    onUploadEvidence,
    revisionHistory,
    selectedId,
    submitDisabledReason,
}: {
    score: PbasApp["apiScore"];
    caps?: PbasSummary["scoringWeights"]["caps"];
    entries: IndicatorEntry[];
    entryLoading: boolean;
    entryError: string | null;
    canEdit: boolean;
    facultyId: string;
    onUploadEvidence: (indicatorId: string, documentId: string) => void;
    revisionHistory: PbasRevisionSummary[];
    selectedId: string | null;
    submitDisabledReason: string | null;
}) {
    return (
        <div className="space-y-6">
            <SectionHeader
                title="Score and review"
                description="Check the computed score, attach evidence, then submit for review."
                actions={
                    selectedId ? (
                        <Button asChild type="button" variant="outline" size="sm">
                            <a href={`/api/pbas/${selectedId}/report`}>
                                <Download aria-hidden />
                                Download PDF
                            </a>
                        </Button>
                    ) : null
                }
            />

            {submitDisabledReason ? (
                <InlineAlert tone="warning" title="Not ready to submit">
                    {submitDisabledReason}
                </InlineAlert>
            ) : null}

            <PBASScoreCalculator score={score} caps={caps} />

            <Card>
                <CardHeader>
                    <CardTitle>Indicator totals</CardTitle>
                    <CardDescription>
                        Attach supporting evidence against each indicator before submitting.
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
        </div>
    );
}
