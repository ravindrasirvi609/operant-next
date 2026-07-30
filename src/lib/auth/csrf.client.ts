"use client";

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/auth/constants";

/**
 * Browser-side CSRF helpers (double-submit cookie pattern).
 *
 * The server sets a non-`httpOnly` `umis_csrf` cookie on login; these helpers
 * read it and attach it as the `x-csrf-token` header on state-changing
 * requests. Adopt {@link csrfFetch} for mutations when rolling out
 * `CSRF_ENFORCE`. See `src/lib/auth/csrf.ts` for the server counterpart.
 */

/** Read the CSRF token from the (client-readable) `umis_csrf` cookie. */
export function getCsrfToken(): string | null {
    if (typeof document === "undefined") {
        return null;
    }

    const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`));

    return match ? decodeURIComponent(match.slice(CSRF_COOKIE_NAME.length + 1)) : null;
}

/**
 * Drop-in `fetch` wrapper that adds the CSRF header on unsafe methods
 * (POST/PUT/PATCH/DELETE). Safe methods pass through unchanged.
 *
 * ```ts
 * await csrfFetch(`/api/pbas/${id}/submit`, { method: "POST" });
 * ```
 */
export async function csrfFetch(
    input: RequestInfo | URL,
    init: RequestInit = {}
): Promise<Response> {
    const method = (init.method ?? "GET").toUpperCase();
    const needsToken = !["GET", "HEAD", "OPTIONS"].includes(method);
    const token = needsToken ? getCsrfToken() : null;

    const headers = new Headers(init.headers);
    if (token) {
        headers.set(CSRF_HEADER_NAME, token);
    }

    return fetch(input, { ...init, headers });
}
