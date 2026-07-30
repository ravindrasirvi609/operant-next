import { cookies } from "next/headers";
import { randomUUID, timingSafeEqual } from "node:crypto";

import { authConfig } from "@/lib/auth/config";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/auth/constants";
import { AuthError } from "@/lib/auth/errors";

/**
 * CSRF protection using the **double-submit cookie** pattern.
 *
 * On session creation the server issues a random `umis_csrf` cookie that is
 * intentionally readable by client JavaScript. Clients echo the value back in
 * the `x-csrf-token` header on state-changing requests; the server verifies the
 * header matches the cookie. An attacker on another origin cannot read the
 * victim's cookie, so cannot forge the header — while a same-origin script can.
 *
 * This complements the `sameSite: "lax"` session cookie (which already blocks
 * the primary cross-site request-forgery vector) with defense in depth. No
 * server-side state is required.
 *
 * @see src/lib/auth/csrf.client.ts — the browser helper that reads + sends the token
 * @see src/proxy.ts — central enforcement (gated by CSRF_ENFORCE)
 * @see docs/21_Security_Hardening.md
 */

/** Generate a fresh, unguessable CSRF token. */
export function generateCsrfToken(): string {
    return randomUUID();
}

/**
 * Issue (or refresh) the CSRF cookie. Deliberately **not** `httpOnly` so the
 * browser can read it and echo it in the request header. Paired 1:1 with the
 * session cookie lifecycle.
 */
export async function setCsrfCookie(token: string = generateCsrfToken()): Promise<string> {
    const cookieStore = await cookies();
    cookieStore.set(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: authConfig.sessionDurationSeconds,
    });
    return token;
}

/** Remove the CSRF cookie (called alongside the session clear on logout). */
export async function clearCsrfCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(CSRF_COOKIE_NAME, "", {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });
}

/** Constant-time compare that returns false (never throws) on length mismatch. */
function safeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

/** Read a single cookie value out of a raw `Cookie` header. */
function readCookie(cookieHeader: string | null, name: string): string | null {
    if (!cookieHeader) {
        return null;
    }

    for (const part of cookieHeader.split(";")) {
        const [rawName, ...rest] = part.trim().split("=");
        if (rawName === name) {
            return decodeURIComponent(rest.join("="));
        }
    }

    return null;
}

/**
 * Verify the double-submit token on a state-changing request: the
 * `x-csrf-token` header must match the `umis_csrf` cookie. Throws `AuthError`
 * (403) otherwise.
 *
 * Exposed for optional route-level enforcement; the proxy performs the same
 * check centrally when `CSRF_ENFORCE` is enabled.
 */
export function assertCsrfToken(request: Request): void {
    const headerToken = request.headers.get(CSRF_HEADER_NAME);
    const cookieToken = readCookie(request.headers.get("cookie"), CSRF_COOKIE_NAME);

    if (!headerToken || !cookieToken || !safeEqual(headerToken, cookieToken)) {
        throw new AuthError("Invalid or missing CSRF token.", 403);
    }
}
