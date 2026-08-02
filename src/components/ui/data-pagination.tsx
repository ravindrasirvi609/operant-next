"use client";

import * as React from "react";

import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

/**
 * Client-side pagination for the long in-memory tables.
 *
 * The rosters, evidence queue, and audit log all render their full result set
 * into a single table — a few thousand student rows means a few thousand DOM
 * nodes and a page that scrolls forever. These lists are already fetched whole
 * by the server, so slicing them in the client is the smallest change that fixes
 * the usability problem. (`src/lib/pagination.ts` exists for genuine server-side
 * pagination; adopting it here would mean changing those API routes too.)
 */
export function useClientPagination<T>(items: T[], pageSize = 25) {
    const [page, setPage] = React.useState(1);

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

    // Filtering can shrink the list under the current page — snap back rather
    // than showing an empty table.
    const safePage = Math.min(page, totalPages);
    React.useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const pageItems = React.useMemo(
        () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
        [items, safePage, pageSize]
    );

    return {
        page: safePage,
        setPage,
        totalPages,
        pageItems,
        total: items.length,
        pageSize,
        /** Inclusive 1-based range of the visible slice, for the "x-y of z" label. */
        from: items.length === 0 ? 0 : (safePage - 1) * pageSize + 1,
        to: Math.min(safePage * pageSize, items.length),
    };
}

/** Renders at most 7 page links, collapsing the middle with an ellipsis. */
function pageWindow(page: number, totalPages: number): Array<number | "…"> {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages = new Set<number>([1, totalPages, page]);
    for (const offset of [-1, 1]) {
        const candidate = page + offset;
        if (candidate > 1 && candidate < totalPages) pages.add(candidate);
    }

    const sorted = [...pages].sort((a, b) => a - b);
    const out: Array<number | "…"> = [];

    sorted.forEach((value, index) => {
        if (index > 0 && value - sorted[index - 1] > 1) out.push("…");
        out.push(value);
    });

    return out;
}

export function DataPagination({
    page,
    totalPages,
    onPageChange,
    from,
    to,
    total,
    label = "rows",
    className,
}: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    from: number;
    to: number;
    total: number;
    label?: string;
    className?: string;
}) {
    if (total === 0) return null;

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-between gap-3 pt-4 sm:flex-row",
                className
            )}
        >
            <p className="text-xs text-muted-foreground tabular-nums">
                Showing {from}-{to} of {total} {label}
            </p>

            {totalPages > 1 ? (
                <Pagination className="mx-0 w-auto justify-end">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                aria-disabled={page === 1}
                                className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                                onClick={(event) => {
                                    event.preventDefault();
                                    onPageChange(Math.max(1, page - 1));
                                }}
                            />
                        </PaginationItem>

                        {pageWindow(page, totalPages).map((entry, index) =>
                            entry === "…" ? (
                                <PaginationItem key={`gap-${index}`}>
                                    <span className="px-2 text-sm text-muted-foreground">…</span>
                                </PaginationItem>
                            ) : (
                                <PaginationItem key={entry}>
                                    <PaginationLink
                                        href="#"
                                        isActive={entry === page}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            onPageChange(entry);
                                        }}
                                    >
                                        {entry}
                                    </PaginationLink>
                                </PaginationItem>
                            )
                        )}

                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                aria-disabled={page === totalPages}
                                className={
                                    page === totalPages ? "pointer-events-none opacity-50" : undefined
                                }
                                onClick={(event) => {
                                    event.preventDefault();
                                    onPageChange(Math.min(totalPages, page + 1));
                                }}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            ) : null}
        </div>
    );
}
