"use client";

import { RouteError } from "@/components/common/route-error";

/**
 * Root error boundary.
 *
 * Catches render/runtime errors thrown anywhere in the app tree that are not
 * handled by a more specific route-group boundary. Errors that occur in the root
 * layout itself are handled by `global-error.tsx` instead.
 */
export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return <RouteError error={error} reset={reset} boundary="root" />;
}
