/**
 * Server-side error-reporting seam.
 *
 * A single choke point that every server component, route handler, and error
 * boundary can call to report an unexpected error. Today it forwards to the
 * structured {@link logger}; it is also the designated integration point for an
 * external error tracker (e.g. Sentry).
 *
 * ## Activating Sentry later (3 steps)
 *
 * 1. `npm install @sentry/nextjs` and run `npx @sentry/wizard@latest -i nextjs`.
 * 2. Add `SENTRY_DSN` to the environment contract in `src/lib/env.ts`.
 * 3. Uncomment the `Sentry.captureException(...)` line below.
 *
 * Because every call site already routes through this function, wiring Sentry is
 * a one-file change — no hunting for `try/catch` blocks across the codebase.
 *
 * @see src/lib/observability.client.ts — browser counterpart for Client Components
 * @see docs/20_Foundational_Hardening.md — §Error tracking
 */
import { logger } from "@/lib/logger";

/** Arbitrary structured context attached to a reported error. */
export type ErrorContext = Record<string, unknown>;

/**
 * Report an unexpected server error.
 *
 * @param error   The thrown value (any type; non-Error values are logged as-is).
 * @param context Optional structured context. A `message` field, if present, is
 *                used as the human-readable log message.
 */
export function reportError(error: unknown, context: ErrorContext = {}): void {
    const { message, ...rest } = context;
    logger.error(
        { err: error, ...rest },
        typeof message === "string" ? message : "Unhandled server error"
    );

    // SENTRY ACTIVATION POINT:
    // Sentry.captureException(error, { extra: context });
}
