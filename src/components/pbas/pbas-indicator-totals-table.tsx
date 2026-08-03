"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InlineUpload } from "@/components/ui/file-upload";
import type { UploadedDocument } from "@/lib/upload/service";
import type { IndicatorEntry } from "@/components/pbas/pbas-types";

/**
 * Indicator totals table shared by the Score & Review step (editable, gated by
 * `canEdit`) and the read-only Submission Summary. When `canEdit` is false the
 * evidence column renders a static Uploaded/Not uploaded badge + file link
 * instead of the upload control.
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
        const totals = entries.filter((entry) => entry.indicatorCode.endsWith("_TOTAL"));
        return totals.length ? totals : entries;
    }, [entries]);

    if (loading) {
        return <PbasIndicatorTableSkeleton />;
    }

    if (error) {
        return (
            <div className="rounded-lg border border-destructive-border bg-destructive-muted p-4 text-sm text-destructive-muted-foreground">
                {error}
            </div>
        );
    }

    if (!displayEntries.length) {
        return (
            <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
                Select a PBAS form to view indicator totals.
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Indicator</TableHead>
                        <TableHead className="text-right">Claimed</TableHead>
                        <TableHead className="text-right">Approved</TableHead>
                        <TableHead>Evidence</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {displayEntries.map((entry) => (
                        <TableRow key={entry.indicatorId}>
                            <TableCell className="align-top">
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-foreground">
                                        {entry.indicatorName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {entry.category?.name} • {entry.indicatorCode} • Max {entry.maxScore}
                                    </p>
                                </div>
                            </TableCell>
                            <TableCell className="text-right align-top">
                                <span className="text-sm font-semibold text-foreground">{entry.claimedScore}</span>
                            </TableCell>
                            <TableCell className="text-right align-top">
                                <span className="text-sm font-semibold text-success-muted-foreground">
                                    {entry.approvedScore ?? "--"}
                                </span>
                            </TableCell>
                            <TableCell className="align-top">
                                {canEdit && facultyId ? (
                                    <InlineUpload
                                        category="evidence"
                                        ownerId={facultyId}
                                        mode="document"
                                        value={entry.evidenceDocument ? (entry.evidenceDocument as unknown as UploadedDocument) : null}
                                        onChange={(uploaded) => {
                                            if (uploaded && typeof uploaded === "object") {
                                                onUploadEvidence?.(entry.indicatorId, (uploaded as UploadedDocument)._id);
                                            }
                                        }}
                                        placeholder="Upload evidence"
                                    />
                                ) : entry.evidenceDocument?.fileUrl ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="secondary">Uploaded</Badge>
                                        <a
                                            href={entry.evidenceDocument.fileUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs font-medium text-primary hover:underline"
                                        >
                                            {entry.evidenceDocument.fileName ?? "View file"}
                                        </a>
                                    </div>
                                ) : (
                                    <Badge variant="secondary">Not uploaded</Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function PbasIndicatorTableSkeleton() {
    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <div className="grid gap-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    );
}
