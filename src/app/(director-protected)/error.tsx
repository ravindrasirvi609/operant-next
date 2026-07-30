"use client";

import { RouteError } from "@/components/common/route-error";

/** Error boundary for the director-protected route group. */
export default function DirectorProtectedError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <RouteError
            error={error}
            reset={reset}
            boundary="director-protected"
            title="Director portal error"
        />
    );
}
