"use client";

import { useMemo } from "react";
import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { InlineUpload } from "@/components/ui/file-upload";
import { Skeleton } from "@/components/ui/skeleton";
import type { UploadedDocument } from "@/lib/upload/service";
import type { IndicatorEntry } from "@/components/pbas/pbas-types";

/**
 * Indicator totals, shared by the review step (editable) and the read-only
 * submission summary.
 *
 * Was a four-column `<Table>` whose last column held a file-upload widget. Inside
 * the old narrow form column that never fit, and `<Table>` has no responsive
 * behaviour, so on a phone the whole thing scrolled sideways and the upload
 * control — the one interactive element — was the part pushed off-screen.
 * Rendered as reflowing rows instead, with the numbers kept in a tight group so
 * claimed-versus-approved is still directly comparable.
 */
export function PbasIndicatorTotalsTable({
    entries,
    loading,
    error,
    canEdit,
    facultyId,
    onUploadEvidence,
}: {
    entries: IndicatorEntry[];
    loading: boolean;
    error: string | null;
    canEdit: boolean;
    facultyId?: string;
    onUploadEvidence?: (indicatorId: string, documentId: string) => void;
}) {
    const displayEntries = useMemo(() => {
        // The API returns per-indicator rows plus rolled-up `*_TOTAL` rows; show
        // the totals when present, and fall back to the raw rows otherwise.
        const totals = entries.filter((entry) => entry.indicatorCode.endsWith("_TOTAL"));
        return totals.length ? totals : entries;
    }, [entries]);

    if (loading) {
        return (
            <div className="space-y-2" aria-busy>
                {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={`indicator-skeleton-${index}`} className="h-16 w-full" />
                ))}
            </div>
        );
    }

    if (error) {
        return <InlineAlert message={{ type: "error", text: error }} />;
    }

    if (!displayEntries.length) {
        return (
            <EmptyState
                bordered
                icon={FileText}
                title="No indicator totals yet"
                description="Totals appear once the draft has been saved with at least one source record selected."
                className="py-8"
            />
        );
    }

    return (
        <ul className="divide-y rounded-lg border">
            {displayEntries.map((entry) => (
                <li key={entry.indicatorId} className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold break-words text-foreground">
                                {entry.indicatorName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {[entry.category?.name, entry.indicatorCode, `Max ${entry.maxScore}`]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-4">
                            <div className="text-right">
                                <p className="text-xs tracking-wide text-muted-foreground uppercase">Claimed</p>
                                <p className="text-lg font-semibold tabular-nums text-foreground">
                                    {entry.claimedScore}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs tracking-wide text-muted-foreground uppercase">Approved</p>
                                <p className="text-lg font-semibold tabular-nums text-success-muted-foreground">
                                    {entry.approvedScore ?? "—"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Evidence
                        </span>
                        {canEdit && facultyId ? (
                            <InlineUpload
                                category="evidence"
                                ownerId={facultyId}
                                mode="document"
                                placeholder="Upload evidence"
                                value={
                                    entry.evidenceDocument
                                        ? (entry.evidenceDocument as unknown as UploadedDocument)
                                        : null
                                }
                                onChange={(uploaded) => {
                                    if (uploaded && typeof uploaded === "object") {
                                        onUploadEvidence?.(entry.indicatorId, (uploaded as UploadedDocument)._id);
                                    }
                                }}
                            />
                        ) : entry.evidenceDocument?.fileUrl ? (
                            <>
                                <Badge variant="outline">Uploaded</Badge>
                                <a
                                    href={entry.evidenceDocument.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-medium text-primary hover:underline"
                                >
                                    {entry.evidenceDocument.fileName ?? "View file"}
                                </a>
                            </>
                        ) : (
                            <Badge variant="outline">Not uploaded</Badge>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}
