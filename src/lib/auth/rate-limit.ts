import { AuthError } from "@/lib/auth/errors";

/**
 * Lightweight in-process rate limiter (sliding window).
 *
 * Protects abuse-prone auth endpoints (credential brute force, email/enumeration
 * spam) by capping attempts per client IP per time window. State is held in
 * process memory — correct and fast for a single instance. For a multi-instance
 * deployment, swap the store for Redis (e.g. `@upstash/ratelimit`); the public
 * API here is intentionally storage-agnostic.
 *
 * @see docs/21_Security_Hardening.md
 */

/** A rule: at most `limit` hits per `windowMs` sliding window. */
export interface RateLimitRule {
    limit: number;
    windowMs: number;
}

/** Outcome of a limit check. */
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    /** Milliseconds until the oldest hit ages out (only meaningful when blocked). */
    retryAfterMs: number;
}

const MINUTE = 60_000;

/**
 * Named rules for the auth surface, tunable in one place. Keys double as the
 * limiter bucket names passed to {@link enforceRateLimit}.
 */
export const RATE_LIMIT_RULES = {
    "auth:login": { limit: 10, windowMs: 15 * MINUTE },
    "auth:admin-login": { limit: 10, windowMs: 15 * MINUTE },
    "auth:director-login": { limit: 10, windowMs: 15 * MINUTE },
    "auth:forgot-password": { limit: 5, windowMs: 15 * MINUTE },
    "auth:reset-password": { limit: 10, windowMs: 15 * MINUTE },
    "auth:resend-verification": { limit: 5, windowMs: 15 * MINUTE },
    "auth:activate-faculty": { limit: 10, windowMs: 15 * MINUTE },
    "auth:activate-student": { limit: 10, windowMs: 15 * MINUTE },
    "auth:activate-alumni": { limit: 10, windowMs: 15 * MINUTE },
} satisfies Record<string, RateLimitRule>;

/** Valid limiter bucket names. */
export type RateLimitName = keyof typeof RATE_LIMIT_RULES;

const DEFAULT_RULE: RateLimitRule = { limit: 20, windowMs: 15 * MINUTE };

/**
 * In-memory hit log: bucket key -> ascending list of hit timestamps (ms).
 * Timestamps older than the window are pruned lazily on each check.
 */
const hits = new Map<string, number[]>();

/**
 * Record a hit for `key` and report whether it is within `rule`.
 *
 * `now` is injectable so the sliding-window behaviour is deterministically
 * testable. Mutating the store here (rather than in a separate "record" call)
 * keeps check-and-increment atomic within the single-threaded event loop.
 */
export function checkRateLimit(
    key: string,
    rule: RateLimitRule = DEFAULT_RULE,
    now: number = Date.now()
): RateLimitResult {
    const windowStart = now - rule.windowMs;
    const recent = (hits.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

    if (recent.length >= rule.limit) {
        // Blocked: retry once the oldest in-window hit ages out.
        hits.set(key, recent);
        const retryAfterMs = Math.max(recent[0] + rule.windowMs - now, 0);
        return { allowed: false, remaining: 0, retryAfterMs };
    }

    recent.push(now);
    hits.set(key, recent);
    return { allowed: true, remaining: rule.limit - recent.length, retryAfterMs: 0 };
}

/** Clear rate-limit state — one bucket, or all of it. Intended for tests/ops. */
export function resetRateLimit(key?: string): void {
    if (key) {
        hits.delete(key);
    } else {
        hits.clear();
    }
}

/** Best-effort client IP from standard proxy headers. */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        const first = forwarded.split(",")[0]?.trim();
        if (first) {
            return first;
        }
    }
    return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Enforce a named rate limit for `request`, keyed by client IP. Throws
 * `AuthError(429)` when exceeded — surfaced as HTTP 429 by
 * `createApiErrorResponse`. Call at the top of a route handler's `try` block.
 */
export function enforceRateLimit(request: Request, name: RateLimitName): void {
    const key = `${name}:${getClientIp(request)}`;
    const result = checkRateLimit(key, RATE_LIMIT_RULES[name]);

    if (!result.allowed) {
        const seconds = Math.ceil(result.retryAfterMs / 1000);
        throw new AuthError(`Too many attempts. Please try again in ${seconds} seconds.`, 429);
    }
}
