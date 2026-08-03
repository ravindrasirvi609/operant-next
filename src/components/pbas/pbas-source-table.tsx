"use client";

import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PbasSourceRow } from "@/components/pbas/pbas-types";

export function ReadonlySourceTable({
    title,
    rows,
    canEdit,
    onRemove,
    readOnly = false,
}: {
    title: string;
    rows: PbasSourceRow[];
    canEdit: boolean;
    onRemove: (row: PbasSourceRow) => void;
    /** Hides the entire Actions column — used by the read-only Submission Summary. */
    readOnly?: boolean;
}) {
    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {rows.length ? (
                <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Source</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Status</TableHead>
                                {readOnly ? null : <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={`${title}-${row.id}`}>
                                    <TableCell className="align-top text-sm font-medium text-foreground">
                                        {row.sourceType}
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <p className="text-sm font-medium text-foreground">{row.title}</p>
                                        {row.subtitle ? <p className="text-xs text-muted-foreground">{row.subtitle}</p> : null}
                                        {row.note ? (
                                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{row.note}</p>
                                        ) : null}
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Badge variant={row.included ? "default" : "secondary"}>
                                            {row.included ? "Included" : "Excluded"}
                                        </Badge>
                                    </TableCell>
                                    {readOnly ? null : (
                                        <TableCell className="align-top text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button asChild type="button" size="sm" variant="outline">
                                                    <a href={row.sourceHref}>Edit Source</a>
                                                </Button>
                                                {row.included && row.removable !== false ? (
                                                    <ConfirmButton
                                                        type="button"
                                                        size="sm"
                                                        variant="destructive"
                                                        disabled={!canEdit}
                                                        onConfirm={() => onRemove(row)}
                                                        title="Remove this row from the PBAS report?"
                                                        description="The underlying record is not deleted — it is only excluded from this PBAS submission."
                                                        confirmLabel="Remove"
                                                    >
                                                        <Trash2 aria-hidden />
                                                        Remove from PBAS
                                                    </ConfirmButton>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                    No records available in this section for the selected academic year.
                </div>
            )}
        </div>
    );
}

/** Loading placeholder shown while draft source candidates are being fetched. */
export function PbasSourceLoadingSkeleton() {
    return (
        <div className="grid gap-4 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
                <div key={`reference-skeleton-${index}`} className="rounded-lg border border-border bg-card p-4">
                    <div className="grid gap-3">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}
