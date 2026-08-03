"use client";

import * as React from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTimestamp } from "@/lib/ui/dates";
import { resolveStatus } from "@/lib/ui/status";
import { TONE_CLASSES } from "@/lib/ui/tone";
import { cn } from "@/lib/utils";
import { History } from "lucide-react";

/**
 * The one workflow timeline.
 *
 * Replaces three byte-equivalent components — `PBASStatusTimeline`,
 * `CASStatusTimeline`, and the local `AQARStatusTimeline` — and generalises
 * `CASCommitteeTimeline`, which is the same list with `reviewerRole`/`decision`
 * in place of `actorRole`/`status`.
 *
 * Three fixes ride along:
 *
 *   - **Sorting.** Only the AQAR copy sorted newest-first. PBAS and CAS rendered
 *     whatever order the API returned, so the same record read differently in
 *     two modules.
 *   - **Invalid dates.** All three called `new Date(log.changedAt).toLocaleString()`
 *     unguarded, printing "Invalid Date" for a missing timestamp.
 *   - **Status colour.** All three printed the status as plain bold text, so a
 *     rejection looked identical to an approval. It is a `StatusBadge` now, which
 *     carries the tone *and* an icon from lib/ui/status.ts.
 *
 * Visually this is a real rail — dot, connector, indented body — rather than the
 * previous stack of separate bordered boxes, which read as four unrelated cards.
 */

export type TimelineEntry = {
    id?: string;
    /** Raw status/decision string; tone and icon are derived from it. */
    status: string;
    actorName?: string;
    actorRole?: string;
    remarks?: string;
    /** ISO timestamp. */
    changedAt?: string;
};

export function StatusTimeline({
    entries,
    emptyTitle = "No activity yet",
    emptyDescription,
    className,
}: {
    entries: TimelineEntry[];
    emptyTitle?: string;
    emptyDescription?: string;
    className?: string;
}) {
    const sorted = React.useMemo(
        () =>
            [...entries].sort((left, right) => {
                const a = left.changedAt ? new Date(left.changedAt).getTime() : 0;
                const b = right.changedAt ? new Date(right.changedAt).getTime() : 0;
                return b - a;
            }),
        [entries]
    );

    if (!sorted.length) {
        return (
            <EmptyState
                bordered
                icon={History}
                title={emptyTitle}
                description={emptyDescription}
                className="py-8"
            />
        );
    }

    return (
        <ol className={cn("relative space-y-4", className)}>
            {sorted.map((entry, index) => {
                const { tone } = resolveStatus(entry.status);
                const isLast = index === sorted.length - 1;

                return (
                    <li key={entry.id ?? `${entry.status}-${entry.changedAt}-${index}`} className="flex gap-3">
                        <div className="flex flex-col items-center pt-1">
                            <span
                                className={cn("size-2.5 shrink-0 rounded-full", TONE_CLASSES[tone].dot)}
                                aria-hidden
                            />
                            {isLast ? null : <span className="mt-1 w-px flex-1 bg-border" aria-hidden />}
                        </div>

                        <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-1")}>
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={entry.status} />
                                <time className="text-xs text-muted-foreground">
                                    {formatTimestamp(entry.changedAt)}
                                </time>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {entry.actorName
                                    ? `${entry.actorName}${entry.actorRole ? ` · ${entry.actorRole}` : ""}`
                                    : "System"}
                            </p>
                            {entry.remarks ? (
                                <p className="mt-1.5 rounded-md bg-muted/60 px-3 py-2 text-sm break-words text-foreground">
                                    {entry.remarks}
                                </p>
                            ) : null}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
