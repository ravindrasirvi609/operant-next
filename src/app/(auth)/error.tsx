"use client";

import { RouteError } from "@/components/common/route-error";

/** Error boundary for the authentication route group (login, register, reset, …). */
export default function AuthError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <RouteError error={error} reset={reset} boundary="auth" title="Authentication error" />
    );
}
