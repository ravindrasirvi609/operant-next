"use client";

import { RouteError } from "@/components/common/route-error";

/** Error boundary for the admin-protected route group. */
export default function AdminProtectedError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <RouteError error={error} reset={reset} boundary="admin-protected" title="Admin console error" />
    );
}
