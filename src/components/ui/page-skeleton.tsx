import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Route-level loading placeholder.
 *
 * Every authenticated page in this app is a server component that awaits Mongo
 * queries before rendering anything, so without a `loading.tsx` the whole
 * content area stayed blank during navigation. There was exactly one such file
 * in the app; this gives every route group a skeleton that matches the shape
 * the real page will have (header, stat row, content), which makes navigation
 * feel instant rather than stalled.
 *
 * Note there is no `<main>` or page padding here — the shell already provides
 * both, and the old faculty/profile skeleton double-wrapped them.
 */
export function PageSkeleton({
    /** Stat cards to outline. 0 for pages that lead with a form or table. */
    stats = 4,
    /** Rough shape of the body below the stat row. */
    variant = "cards",
    className,
}: {
    stats?: number;
    variant?: "cards" | "table" | "split" | "form";
    className?: string;
}) {
    return (
        <div className={cn("space-y-6", className)} aria-busy aria-live="polite">
            <span className="sr-only">Loading page…</span>

            {/* Page header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <Skeleton className="size-12 shrink-0 rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-7 w-72 max-w-full" />
                        <Skeleton className="h-4 w-96 max-w-full" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-8 w-24" />
                </div>
            </div>

            {stats > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: stats }).map((_, index) => (
                        <Card key={index}>
                            <CardContent className="flex items-start justify-between gap-3 p-5">
                                <div className="space-y-2">
                                    <Skeleton className="h-3 w-24" />
                                    <Skeleton className="h-8 w-16" />
                                </div>
                                <Skeleton className="size-10 rounded-lg" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : null}

            {variant === "table" ? (
                <Card>
                    <CardContent className="space-y-3 p-5">
                        <Skeleton className="h-8 w-64" />
                        {Array.from({ length: 8 }).map((_, index) => (
                            <Skeleton key={index} className="h-11 w-full" />
                        ))}
                    </CardContent>
                </Card>
            ) : null}

            {variant === "split" ? (
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <Card>
                        <CardContent className="space-y-3 p-5">
                            <Skeleton className="h-5 w-40" />
                            {Array.from({ length: 5 }).map((_, index) => (
                                <Skeleton key={index} className="h-20 w-full" />
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="space-y-3 p-5">
                            <Skeleton className="h-5 w-36" />
                            {Array.from({ length: 4 }).map((_, index) => (
                                <Skeleton key={index} className="h-16 w-full" />
                            ))}
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {variant === "form" ? (
                <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
                    <Card>
                        <CardContent className="space-y-4 p-5">
                            <Skeleton className="h-5 w-40" />
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div key={index} className="space-y-1.5">
                                    <Skeleton className="h-3 w-24" />
                                    <Skeleton className="h-8 w-full" />
                                </div>
                            ))}
                            <Skeleton className="h-8 w-32" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="space-y-3 p-5">
                            <Skeleton className="h-5 w-48" />
                            {Array.from({ length: 6 }).map((_, index) => (
                                <Skeleton key={index} className="h-20 w-full" />
                            ))}
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {variant === "cards" ? (
                <div className="grid gap-6 xl:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index}>
                            <CardContent className="space-y-3 p-5">
                                <Skeleton className="h-5 w-44" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-32 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
