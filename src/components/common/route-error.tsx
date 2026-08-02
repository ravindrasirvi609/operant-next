"use client";

import { useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { reportClientError, type BoundaryError } from "@/lib/observability.client";
import { RefreshCw } from "lucide-react";

/**
 * Shared presentational error boundary UI.
 *
 * Used by every route-group `error.tsx` so all boundaries look and behave
 * consistently and report through the same seam. Each route group supplies its
 * own `title`/`boundary` while reusing this component's layout and reporting.
 *
 * Note on messages: in production Next.js replaces server-error messages with a
 * generic string and exposes only `error.digest`, so rendering `error.message`
 * here is safe — real details never reach the browser in production.
 */
interface RouteErrorProps {
    /** The error object Next.js passed to the boundary. */
    error: BoundaryError;
    /** Next.js-provided callback that attempts to re-render the segment. */
    reset: () => void;
    /** Heading shown to the user. Defaults to a generic message. */
    title?: string;
    /** Optional override for the body text (defaults to the error message). */
    description?: string;
    /** Identifies which boundary caught the error, for reporting context. */
    boundary?: string;
}

export function RouteError({
    error,
    reset,
    title = "Something went wrong",
    description,
    boundary,
}: RouteErrorProps) {
    // Report once when the boundary mounts (or when a new error arrives).
    useEffect(() => {
        reportClientError(error, { boundary });
    }, [error, boundary]);

    return (
        <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10 xl:py-10">
            <Alert variant="destructive">
                <AlertTitle>{title}</AlertTitle>
                <AlertDescription>
                    {description ??
                        error.message ??
                        "Please try again. If the issue continues, contact your administrator."}
                    {error.digest ? (
                        <span className="mt-2 block text-xs opacity-70">Reference: {error.digest}</span>
                    ) : null}
                </AlertDescription>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={reset}>
                        <RefreshCw aria-hidden />
                        Try again
                    </Button>
                </div>
            </Alert>
        </main>
    );
}
