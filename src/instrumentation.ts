/**
 * Next.js instrumentation hook.
 *
 * Next.js calls the exported {@link register} function exactly once per runtime,
 * before the app begins handling requests. We use it as the single boot-time
 * entry point to **validate the environment and fail fast** if configuration is
 * missing or malformed — surfacing problems at start-up instead of mid-request.
 *
 * @see src/lib/env.ts — the environment contract that is validated here
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

/**
 * Runs once at server start-up.
 *
 * Guarded by `NEXT_RUNTIME === "nodejs"` because:
 *  - The full environment contract (MongoDB, R2, etc.) only matters to the
 *    Node.js server runtime.
 *  - The `pino` logger relies on Node.js APIs and must not load in the edge
 *    runtime, which also invokes `register`.
 */
export async function register(): Promise<void> {
    if (process.env.NEXT_RUNTIME !== "nodejs") {
        return;
    }

    // Dynamic imports keep `pino`/`zod` out of the edge bundle entirely.
    const { validateEnv } = await import("@/lib/env");
    const { logger } = await import("@/lib/logger");

    try {
        validateEnv();
        logger.info({ nodeEnv: process.env.NODE_ENV }, "UMIS environment validated — server ready");
    } catch (error) {
        // Log the aggregated report, then rethrow so the process refuses to start
        // in a misconfigured state.
        logger.fatal(
            { err: error },
            "Environment validation failed — refusing to start. See the report above."
        );
        throw error;
    }
}
