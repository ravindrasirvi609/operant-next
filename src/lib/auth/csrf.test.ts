import { describe, expect, it, vi } from "vitest";

// csrf.ts imports `next/headers` for its cookie helpers. The functions under
// test here (assertCsrfToken / generateCsrfToken) never call cookies(), but we
// mock the module so importing csrf.ts is safe in the node test environment.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/auth/constants";
import { assertCsrfToken, generateCsrfToken } from "@/lib/auth/csrf";
import { AuthError } from "@/lib/auth/errors";

/** Build a POST request with optional CSRF header and cookie. */
function requestWith(header?: string, cookie?: string): Request {
    const headers = new Headers();
    if (header !== undefined) {
        headers.set(CSRF_HEADER_NAME, header);
    }
    if (cookie !== undefined) {
        headers.set("cookie", `${CSRF_COOKIE_NAME}=${cookie}`);
    }
    return new Request("http://example.test", { method: "POST", headers });
}

describe("assertCsrfToken", () => {
    it("passes when the header matches the cookie", () => {
        const token = generateCsrfToken();
        expect(() => assertCsrfToken(requestWith(token, token))).not.toThrow();
    });

    it("throws 403 when the header and cookie differ", () => {
        let thrown: unknown;
        try {
            assertCsrfToken(requestWith("aaaa", "bbbb"));
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeInstanceOf(AuthError);
        expect((thrown as AuthError).status).toBe(403);
    });

    it("throws when the header is missing", () => {
        expect(() => assertCsrfToken(requestWith(undefined, "bbbb"))).toThrow(AuthError);
    });

    it("throws when the cookie is missing", () => {
        expect(() => assertCsrfToken(requestWith("aaaa", undefined))).toThrow(AuthError);
    });

    it("is not satisfied by an unrelated cookie", () => {
        const headers = new Headers({ [CSRF_HEADER_NAME]: "aaaa", cookie: "other=aaaa" });
        const request = new Request("http://example.test", { method: "POST", headers });
        expect(() => assertCsrfToken(request)).toThrow(AuthError);
    });
});

describe("generateCsrfToken", () => {
    it("produces a distinct token each call", () => {
        expect(generateCsrfToken()).not.toBe(generateCsrfToken());
    });
});
