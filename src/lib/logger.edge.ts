/**
 * Edge-safe structured logger.
 *
 * The Next.js proxy (`src/proxy.ts`, formerly `middleware`) runs in the **edge
 * runtime**, which does not provide the Node.js APIs that `pino` (see
 * `src/lib/logger.ts`) depends on. This module offers the same call shape using
 * only `console`, so proxy logging stays structured without pulling `pino` into
 * the edge bundle.
 *
 * Keep this file dependency-free and Node-API-free.
 *
 * @see src/lib/logger.ts — full Node.js logger
 */

/** Structured fields attached to an edge log line. */
type EdgeLogFields = Record<string, unknown>;

/** Log levels supported at the edge (a subset of pino's). */
type EdgeLevel = "info" | "warn" | "error";

/**
 * Emit a single structured, newline-delimited JSON line. Falls back to a plain
 * string if the fields cannot be serialised (e.g. a circular reference), so
 * logging never throws.
 */
function emit(level: EdgeLevel, msg: string, fields?: EdgeLogFields): void {
    try {
        // Structured stdout is the log transport in the edge runtime.
        console.log(
            JSON.stringify({
                level,
                time: new Date().toISOString(),
                service: "umis-edge",
                msg,
                ...fields,
            })
        );
    } catch {
        // Last-resort fallback if the fields cannot be serialised (e.g. a cycle).
        console.log(`[${level}] ${msg}`);
    }
}

/** Minimal edge logger mirroring the shape of the Node.js `logger`. */
export const edgeLogger = {
    info: (msg: string, fields?: EdgeLogFields) => emit("info", msg, fields),
    warn: (msg: string, fields?: EdgeLogFields) => emit("warn", msg, fields),
    error: (msg: string, fields?: EdgeLogFields) => emit("error", msg, fields),
};
