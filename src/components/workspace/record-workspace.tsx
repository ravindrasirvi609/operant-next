"use client";

import * as React from "react";
import { ArrowLeft, PanelRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InlineAlert, type FeedbackMessage } from "@/components/ui/inline-alert";
import { SectionHeader } from "@/components/ui/page-header";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

/**
 * The list → focused-wizard workspace shell.
 *
 * All four modules previously used a hard `xl:grid-cols-[340px_1fr]` split with
 * the record list, the create button, and the status timeline crammed into a
 * fixed 340px rail. That layout has one good breakpoint. Below 1280px the grid
 * collapses to a single column, so a faculty member on a tablet scrolled past
 * the create button, the full application list, the timeline, and (in CAS) the
 * committee trail and the document-verification card before reaching the form
 * they opened the page for. Above 1280px the form was left with whatever was
 * after 340px — on a 1366px laptop that is ~950px for a grid the AQAR code
 * declared as `xl:grid-cols-4`, i.e. four ~200px inputs.
 *
 * Splitting it in two fixes both ends. `WorkspaceIndex` is a plain responsive
 * card grid with nothing competing for width. `WorkspaceDetail` replaces it and
 * gives the form the whole column, moving the timeline into a rail that is a
 * real aside at `xl` and a `Sheet` below it — so the secondary context is one
 * tap away instead of a screen of scrolling.
 */

/** Landing view: overview, then the record grid. */
export function WorkspaceIndex({
    overview,
    listTitle,
    listDescription,
    listActions,
    message,
    children,
    className,
}: {
    /** Stat cards / eligibility strip. Rendered above the list. */
    overview?: React.ReactNode;
    listTitle: string;
    listDescription?: string;
    /** Usually the create-draft button. */
    listActions?: React.ReactNode;
    message?: FeedbackMessage | null;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("space-y-6", className)}>
            {message ? <InlineAlert message={message} /> : null}
            {overview}
            <section className="space-y-4">
                <SectionHeader title={listTitle} description={listDescription} actions={listActions} />
                {children}
            </section>
        </div>
    );
}

/** Responsive record grid. One column on phones — never a fixed-width track. */
export function RecordGrid({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3", className)}
            {...props}
        />
    );
}

/**
 * Focused view for one record. Sticky header, full-width body, optional rail.
 */
export function WorkspaceDetail({
    onBack,
    backLabel = "All records",
    title,
    subtitle,
    status,
    /** Autosave indicator and/or record-level buttons, right of the title. */
    headerAside,
    /** Secondary context: timeline, metadata, verification state. */
    rail,
    railTitle = "Record details",
    message,
    children,
    className,
}: {
    onBack: () => void;
    backLabel?: string;
    title: string;
    subtitle?: string;
    status?: string;
    headerAside?: React.ReactNode;
    rail?: React.ReactNode;
    railTitle?: string;
    message?: FeedbackMessage | null;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("space-y-4", className)}>
            {/* `top-14` clears the RoleShell header, which is a 14-unit sticky bar. */}
            <div className="sticky top-14 z-20 -mx-1 border-b bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Button type="button" variant="ghost" size="sm" onClick={onBack} className="-ml-2 shrink-0">
                        <ArrowLeft aria-hidden />
                        <span className="hidden sm:inline">{backLabel}</span>
                        <span className="sm:hidden">Back</span>
                    </Button>

                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h2 className="truncate text-base font-semibold text-foreground sm:text-lg">
                                {title}
                            </h2>
                            {status ? <StatusBadge status={status} /> : null}
                        </div>
                        {subtitle ? (
                            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                        ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        {headerAside}
                        {rail ? (
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button type="button" variant="outline" size="sm" className="xl:hidden">
                                        <PanelRight aria-hidden />
                                        <span className="sr-only sm:not-sr-only">Details</span>
                                    </Button>
                                </SheetTrigger>
                                <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
                                    <SheetHeader>
                                        <SheetTitle>{railTitle}</SheetTitle>
                                    </SheetHeader>
                                    <div className="space-y-6 p-4">{rail}</div>
                                </SheetContent>
                            </Sheet>
                        ) : null}
                    </div>
                </div>
            </div>

            {message ? <InlineAlert message={message} /> : null}

            <div
                className={cn(
                    "grid min-w-0 gap-6",
                    rail && "xl:grid-cols-[minmax(0,1fr)_320px]"
                )}
            >
                <div className="min-w-0 space-y-6">{children}</div>
                {rail ? (
                    <aside className="hidden min-w-0 space-y-6 xl:block">{rail}</aside>
                ) : null}
            </div>
        </div>
    );
}
