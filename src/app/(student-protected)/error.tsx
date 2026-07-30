"use client";

import { RouteError } from "@/components/common/route-error";

/** Error boundary for the student-protected route group. */
export default function StudentProtectedError({
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
            boundary="student-protected"
            title="Student portal error"
        />
    );
}
