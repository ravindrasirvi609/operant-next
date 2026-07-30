/**
 * Structured application logger (Node.js runtime).
 *
 * Replaces ad-hoc `console.*` calls with a single, structured, level-aware
 * logger as mandated by `docs/18_Coding_Standards.md` §9. Every log line is a
 * JSON object in production (machine-parseable by log aggregators) and a
 * colourised, human-readable line in development.
 *
 * ## Redaction
 *
 * Sensitive fields (cookies, authorization headers, passwords, tokens, secrets,
 * API keys) are automatically redacted so they can never leak into logs. Always
 * pass structured data as the first argument so redaction can find it:
 *
 * ```ts
 * logger.error({ err, userId }, "Failed to submit PBAS form");   // ✅ redactable
 * logger.error(`Failed for token ${token}`);                     // ❌ not redactable
 * ```
 *
 * ## Runtime boundary
 *
 * This module imports `pino`, which relies on Node.js APIs and MUST NOT be
 * imported from the edge runtime (i.e. `src/proxy.ts`). Edge code uses
 * `src/lib/logger.edge.ts` instead.
 *
 * @see src/lib/logger.edge.ts — edge-safe counterpart
 * @see src/lib/observability.ts — error-reporting seam built on top of this
 */
import pino, { type Logger } from "pino";

import { getLogLevel, isDevelopment } from "@/lib/env";

/**
 * Paths pino will redact before writing. Covers both top-level keys and the
 * common `req`/`headers` shapes so request logging is safe by default.
 */
const REDACT_PATHS = [
    "password",
    "*.password",
    "token",
    "*.token",
    "secret",
    "*.secret",
    "apiKey",
    "*.apiKey",
    "authorization",
    "cookie",
    "headers.cookie",
    "headers.authorization",
    "req.headers.cookie",
    "req.headers.authorization",
    "*.AUTH_SECRET",
    "*.ADMIN_BOOTSTRAP_SECRET",
];

/**
 * The singleton application logger.
 *
 * - Level comes from `LOG_LEVEL` (default `info`).
 * - In development we stream through `pino-pretty` for readability.
 * - In production we emit newline-delimited JSON to stdout for aggregation.
 *
 * Note: `pino` and `pino-pretty` are declared in `serverExternalPackages`
 * (`next.config.ts`) so Next.js does not attempt to bundle their worker-thread
 * transport, which would otherwise break the build.
 */
export const logger: Logger = pino({
    level: getLogLevel(),
    base: { service: "umis" },
    redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
    ...(isDevelopment()
        ? {
              transport: {
                  target: "pino-pretty",
                  options: {
                      colorize: true,
                      translateTime: "SYS:standard",
                      ignore: "pid,hostname",
                  },
              },
          }
        : {}),
});

/**
 * Create a child logger with fixed bindings (e.g. a module name or request id)
 * merged into every line. Prefer this over the root logger inside a subsystem so
 * that its logs are attributable.
 *
 * ```ts
 * const log = createLogger({ module: "pbas" });
 * log.info({ formId }, "PBAS form submitted");
 * ```
 */
export function createLogger(bindings: Record<string, unknown>): Logger {
    return logger.child(bindings);
}
