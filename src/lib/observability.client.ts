"use client";

/**
 * Client-side error-reporting seam.
 *
 * The browser counterpart to `src/lib/observability.ts`. React error boundaries
 * (`error.tsx` / `global-error.tsx`) are Client Components and cannot import the
 * server logger, so they report through this function instead.
 *
 * It currently logs a structured line to the browser console and is the
 * designated integration point for Sentry's browser SDK.
 *
 * @see src/lib/observability.ts — server counterpart
 */

/** Arbitrary structured context attached to a reported client error. */
export type ClientErrorContext = Record<string, unknown>;

/** The shape Next.js passes to an `error.tsx` boundary. */
export type BoundaryError = Error & { digest?: string };

/**
 * Report an error caught by a client-side React error boundary.
 *
 * @param error   The error the boundary received (carries an optional `digest`).
 * @param context Optional structured context (e.g. the boundary's route group).
 */
export function reportClientError(error: BoundaryError, context: ClientErrorContext = {}): void {
    // The browser console is the client transport until Sentry is wired (see below).
    console.error("[UMIS client error]", {
        message: error?.message,
        digest: error?.digest,
        ...context,
    });

    // SENTRY ACTIVATION POINT (browser):
    // Sentry.captureException(error, { extra: context });
}
