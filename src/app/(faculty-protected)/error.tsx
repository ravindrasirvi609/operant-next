"use client";

import { RouteError } from "@/components/common/route-error";

/**
 * Error boundary for the faculty-protected route group.
 *
 * Note: a more specific boundary exists at `faculty/profile/error.tsx` and will
 * catch errors within that subtree before this one.
 */
export default function FacultyProtectedError({
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
            boundary="faculty-protected"
            title="Faculty workspace error"
        />
    );
}
