import { afterEach, describe, expect, it } from "vitest";

import { AuthError } from "@/lib/auth/errors";
import {
    checkRateLimit,
    enforceRateLimit,
    getClientIp,
    resetRateLimit,
    type RateLimitRule,
} from "@/lib/auth/rate-limit";

// The limiter holds module-level state; clear it between cases.
afterEach(() => resetRateLimit());

describe("checkRateLimit", () => {
    const rule: RateLimitRule = { limit: 3, windowMs: 1000 };

    it("allows hits up to the limit", () => {
        expect(checkRateLimit("k", rule, 0).allowed).toBe(true);
        expect(checkRateLimit("k", rule, 100).allowed).toBe(true);
        expect(checkRateLimit("k", rule, 200).allowed).toBe(true);
    });

    it("blocks the hit that exceeds the limit within the window", () => {
        checkRateLimit("k", rule, 0);
        checkRateLimit("k", rule, 10);
        checkRateLimit("k", rule, 20);

        const blocked = checkRateLimit("k", rule, 30);
        expect(blocked.allowed).toBe(false);
        expect(blocked.remaining).toBe(0);
        expect(blocked.retryAfterMs).toBeGreaterThan(0);
    });

    it("allows again once the window slides past the old hits", () => {
        checkRateLimit("k", rule, 0);
        checkRateLimit("k", rule, 10);
        checkRateLimit("k", rule, 20);
        expect(checkRateLimit("k", rule, 30).allowed).toBe(false);

        // Advance beyond the window so every prior hit ages out.
        expect(checkRateLimit("k", rule, 1001).allowed).toBe(true);
    });

    it("tracks buckets independently by key", () => {
        checkRateLimit("a", rule, 0);
        checkRateLimit("a", rule, 1);
        checkRateLimit("a", rule, 2);
        expect(checkRateLimit("a", rule, 3).allowed).toBe(false);
        expect(checkRateLimit("b", rule, 3).allowed).toBe(true);
    });
});

describe("getClientIp", () => {
    it("uses the first x-forwarded-for entry", () => {
        const request = new Request("http://x", {
            headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
        });
        expect(getClientIp(request)).toBe("1.2.3.4");
    });

    it("falls back to x-real-ip, then to 'unknown'", () => {
        expect(
            getClientIp(new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } }))
        ).toBe("9.9.9.9");
        expect(getClientIp(new Request("http://x"))).toBe("unknown");
    });
});

describe("enforceRateLimit", () => {
    it("throws a 429 AuthError once the named bucket is exhausted", () => {
        const request = new Request("http://x", {
            headers: { "x-forwarded-for": "10.0.0.1" },
        });

        // auth:forgot-password permits 5 attempts per window.
        for (let i = 0; i < 5; i += 1) {
            enforceRateLimit(request, "auth:forgot-password");
        }

        let thrown: unknown;
        try {
            enforceRateLimit(request, "auth:forgot-password");
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(AuthError);
        expect((thrown as AuthError).status).toBe(429);
    });

    it("keys limits by client IP, so a different IP is unaffected", () => {
        const first = new Request("http://x", { headers: { "x-forwarded-for": "10.0.0.2" } });
        const second = new Request("http://x", { headers: { "x-forwarded-for": "10.0.0.3" } });

        for (let i = 0; i < 5; i += 1) {
            enforceRateLimit(first, "auth:forgot-password");
        }

        // Same bucket, different IP → still allowed.
        expect(() => enforceRateLimit(second, "auth:forgot-password")).not.toThrow();
    });
});
