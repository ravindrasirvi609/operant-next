"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { DetailInline, type DetailItem } from "@/components/workspace/detail-list";
import { cn } from "@/lib/utils";

/**
 * One selectable record in a workspace index.
 *
 * Replaces four hand-rolled versions. They had drifted apart in every respect
 * that matters:
 *
 *   - PBAS and CAS used `<button>` (good) but `<Badge variant="secondary">` for
 *     status, so "Rejected" and "Approved" were the same grey.
 *   - AQAR used `role="button" tabIndex={0}` on a `<div>` with a hand-written
 *     `onKeyDown` handler, and had to call `event.stopPropagation()` on its
 *     nested delete trigger to stop the card from also selecting the record —
 *     the comment at aqar-dashboard.tsx:935 documents the workaround.
 *   - SSR used `<button>` but inverted its own colours on selection, producing
 *     `text-primary-foreground/75` body text that failed contrast on the
 *     unselected surface.
 *
 * The nesting problem is solved without JavaScript here: the title is a real
 * `<button>` whose `::after` is stretched over the whole card, and `actions`
 * render in a sibling above it. Two buttons, two tab stops, no event plumbing.
 */

export type RecordCardProps = {
    title: string;
    subtitle?: string;
    status?: string;
    /** Compact metadata shown under the title, e.g. API score, last activity. */
    meta?: DetailItem[];
    onOpen: () => void;
    /** Accessible name for the open action, e.g. "Open 2025-26 PBAS draft". */
    openLabel: string;
    /** Visible call to action. Defaults to "Continue". */
    openHint?: string;
    /** Destructive/secondary controls; rendered above the stretched hit area. */
    actions?: React.ReactNode;
    /** Highlights the record the detail view is currently showing. */
    active?: boolean;
    className?: string;
};

export function RecordCard({
    title,
    subtitle,
    status,
    meta,
    onOpen,
    openLabel,
    openHint = "Continue",
    actions,
    active = false,
    className,
}: RecordCardProps) {
    return (
        <div
            className={cn(
                "group relative flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4 transition-colors",
                "focus-within:ring-2 focus-within:ring-ring hover:border-ring/50 hover:bg-accent/40",
                active && "border-primary/60 ring-1 ring-primary/30",
                className
            )}
        >
            <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                    <h3 className="text-base font-semibold text-foreground">
                        <button
                            type="button"
                            onClick={onOpen}
                            aria-label={openLabel}
                            className="text-left after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
                        >
                            <span className="line-clamp-2 break-words">{title}</span>
                        </button>
                    </h3>
                    {subtitle ? (
                        <p className="line-clamp-2 text-sm break-words text-muted-foreground">{subtitle}</p>
                    ) : null}
                </div>

                <div className="relative z-10 flex shrink-0 items-center gap-1.5">
                    {status ? <StatusBadge status={status} /> : null}
                    {actions}
                </div>
            </div>

            {meta?.length ? <DetailInline items={meta} /> : null}

            <p className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
                {openHint}
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </p>
        </div>
    );
}
