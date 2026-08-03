"use client";

import { ExternalLink, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PbasSourceRow } from "@/components/pbas/pbas-types";

/**
 * One group of candidate source records.
 *
 * The original was a `<Table>` with four columns — Source, Details, Status,
 * Actions — where Actions held two full-width buttons ("Edit Source" and "Remove
 * from PBAS"). Inside the old 340px-constrained form column that table could not
 * fit, so it sat in a horizontal scroller and the Remove button was reachable
 * only by scrolling sideways. On a phone the header row alone was wider than the
 * viewport.
 *
 * A table was the wrong form here anyway: these are four facts and two actions
 * per record, not a grid to be scanned column-wise. This renders them as rows
 * that reflow, so nothing scrolls horizontally at any width.
 */
export function PbasSourceGroup({
    title,
    rows,
    canEdit,
    onToggle,
    readOnly = false,
}: {
    title: string;
    rows: PbasSourceRow[];
    canEdit: boolean;
    onToggle: (row: PbasSourceRow) => void;
    /** Hides all actions — used by the read-only submission summary. */
    readOnly?: boolean;
}) {
    const includedCount = rows.filter((row) => row.included).length;

    return (
        <section className="rounded-lg border bg-card">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <h4 className="text-sm font-semibold text-foreground">{title}</h4>
                {rows.length ? (
                    <Badge variant="outline">
                        {includedCount} of {rows.length} included
                    </Badge>
                ) : null}
            </header>

            {rows.length ? (
                <ul className="divide-y">
                    {rows.map((row) => (
                        <li
                            key={`${title}-${row.id}`}
                            className={cn(
                                "flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between",
                                !row.included && "bg-muted/30"
                            )}
                        >
                            <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={row.included ? "default" : "outline"}>
                                        {row.included ? "Included" : "Excluded"}
                                    </Badge>
                                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        {row.sourceType}
                                    </span>
                                </div>
                                <p className="text-sm font-medium break-words text-foreground">{row.title}</p>
                                {row.subtitle ? (
                                    <p className="text-sm break-words text-muted-foreground">{row.subtitle}</p>
                                ) : null}
                                {row.note ? (
                                    <p className="text-xs text-muted-foreground">{row.note}</p>
                                ) : null}
                            </div>

                            {readOnly ? null : (
                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                    <Button asChild type="button" size="sm" variant="ghost">
                                        <a href={row.sourceHref}>
                                            <ExternalLink aria-hidden />
                                            Edit source
                                        </a>
                                    </Button>
                                    {row.included ? (
                                        row.removable === false ? null : (
                                            <ConfirmButton
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={!canEdit}
                                                onConfirm={() => onToggle(row)}
                                                title="Exclude this record from the PBAS report?"
                                                description="The underlying record is not deleted — it is only left out of this PBAS submission. You can include it again from this list."
                                                confirmLabel="Exclude"
                                            >
                                                <Trash2 aria-hidden />
                                                Exclude
                                            </ConfirmButton>
                                        )
                                    ) : (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={!canEdit}
                                            onClick={() => onToggle(row)}
                                        >
                                            Include
                                        </Button>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyState
                    title="Nothing available in this section"
                    description="No records exist for the selected academic year. Add them in your faculty profile first."
                    className="py-8"
                />
            )}
        </section>
    );
}

/** Placeholder while draft source candidates load. */
export function PbasSourceLoadingSkeleton() {
    return (
        <div className="space-y-4" aria-busy>
            {Array.from({ length: 2 }).map((_, index) => (
                <div key={`source-skeleton-${index}`} className="space-y-3 rounded-lg border bg-card p-4">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                </div>
            ))}
        </div>
    );
}
