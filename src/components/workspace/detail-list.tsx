import * as React from "react";

import { EMPTY_VALUE } from "@/lib/ui/dates";
import { cn } from "@/lib/utils";

/**
 * The label / value pair.
 *
 * This existed six times under six names, all rendering the same two-line block
 * with a different uppercase tracking value: `InfoRow` and the local `InfoCard`
 * (SSR), `SummaryTile`, `SummaryChip`, and `DashboardStat` (AQAR), and `MetricCard`
 * (AQAR + SSR — the AQAR one was literally `return <StatTile ... />`).
 *
 * Use `StatCard`/`StatTile` for *numbers you want emphasised*; use `DetailList`
 * for descriptive metadata (period, designation, last activity), where a 3xl
 * numeral would be wrong. That is the distinction the six copies had lost.
 */

export type DetailItem = {
    label: string;
    value: React.ReactNode;
    /** Let a long value span the full row on wide screens. */
    wide?: boolean;
};

export function DetailList({
    items,
    columns = 2,
    className,
}: {
    items: DetailItem[];
    columns?: 1 | 2 | 3;
    className?: string;
}) {
    const columnClass =
        columns === 1
            ? "grid-cols-1"
            : columns === 3
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1 sm:grid-cols-2";

    return (
        <dl className={cn("grid gap-3", columnClass, className)}>
            {items.map((item) => (
                <div
                    key={item.label}
                    className={cn(
                        "min-w-0 rounded-lg border bg-muted/40 px-3 py-2.5",
                        item.wide && "sm:col-span-full"
                    )}
                >
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {item.label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium break-words text-foreground">
                        {item.value === null || item.value === undefined || item.value === ""
                            ? EMPTY_VALUE
                            : item.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

/**
 * Borderless inline variant for dense headers, where a grid of bordered tiles
 * would compete with the card it sits inside.
 */
export function DetailInline({ items, className }: { items: DetailItem[]; className?: string }) {
    return (
        <dl className={cn("flex flex-wrap gap-x-6 gap-y-2", className)}>
            {items.map((item) => (
                <div key={item.label} className="min-w-0">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {item.label}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-foreground">
                        {item.value === null || item.value === undefined || item.value === ""
                            ? EMPTY_VALUE
                            : item.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
