import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/auth/constants";
import { edgeLogger } from "@/lib/logger.edge";

/**
 * Security backstop proxy (edge runtime).
 *
 * This is the Next.js "proxy" convention (formerly `middleware`; renamed in
 * Next.js 16). It is a defence-in-depth layer that runs before every matched
 * request and does two things:
 *
 *   1. **Applies security response headers** to every response (clickjacking,
 *      MIME-sniffing, referrer, permissions, and a Content-Security-Policy in
 *      Report-Only mode — see note below).
 *   2. **Gates `/api/admin/*`** so only a valid Admin session may reach admin
 *      endpoints — with an allowlist for bootstrap, which by definition runs
 *      before any admin exists.
 *
 * Page-level route guards (in the `(*-protected)` layouts) remain authoritative
 * for redirect logic; this proxy only *adds* protection, it does not replace
 * those guards.
 *
 * ## Runtime note
 * The proxy runs in the **edge runtime**, so it must not import the Node.js
 * `pino` logger (`src/lib/logger.ts`) or any Node-only module. It uses
 * `src/lib/logger.edge.ts` and `jose` (edge-compatible) only.
 *
 * ## CSP note
 * The CSP ships in **Report-Only** mode so it cannot break the 73 existing
 * pages. Violations are reported to the browser console for monitoring. Once the
 * policy has been validated in staging, promote it to the enforcing
 * `Content-Security-Policy` header (see docs/20_Foundational_Hardening.md).
 *
 * @see docs/20_Foundational_Hardening.md — §Security proxy
 * @see src/lib/auth/config.ts — the `umis_session` cookie name
 */

/** Session cookie name — must match `authConfig.cookieName`. */
const SESSION_COOKIE = "umis_session";

/** The role claim value that denotes an administrator (see UserRole). */
const ADMIN_ROLE = "Admin";

/**
 * Admin API paths that must stay reachable WITHOUT an admin session.
 * `/api/admin/bootstrap` creates the very first admin, so it cannot itself
 * require one (it is protected by `x-admin-bootstrap-secret` instead).
 */
const ADMIN_API_ALLOWLIST = ["/api/admin/bootstrap"];

/** HTTP methods that never mutate state and are therefore exempt from CSRF. */
const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Paths exempt from CSRF: the session-establishing endpoints, which by
 * definition run before a CSRF cookie exists (they are protected by
 * `sameSite: "lax"` + rate limiting instead).
 */
const CSRF_EXEMPT_PREFIXES = ["/api/auth/", "/api/admin/bootstrap"];

/** Build the HMAC key for verifying session JWTs, or null if unavailable. */
function getSecretKey(): Uint8Array | null {
    const secret = process.env.AUTH_SECRET;
    return secret ? new TextEncoder().encode(secret) : null;
}

/**
 * Verify the session cookie and return the role claim.
 *
 * Returns `null` for a missing/invalid/expired token — callers treat that as
 * "not authenticated". Never throws.
 */
async function getSessionRole(token: string | undefined): Promise<string | null> {
    if (!token) return null;

    const key = getSecretKey();
    if (!key) {
        // Should never happen: env validation guarantees AUTH_SECRET at boot.
        edgeLogger.error("AUTH_SECRET unavailable in edge runtime — cannot verify session");
        return null;
    }

    try {
        const { payload } = await jwtVerify(token, key);
        return typeof payload.role === "string" ? payload.role : null;
    } catch {
        return null;
    }
}

/** True if the path is an admin API route that is NOT on the allowlist. */
function isGuardedAdminApi(pathname: string): boolean {
    if (!pathname.startsWith("/api/admin/") && pathname !== "/api/admin") {
        return false;
    }
    return !ADMIN_API_ALLOWLIST.some(
        (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`)
    );
}

/**
 * Whether this request must pass a CSRF check: only when `CSRF_ENFORCE` is on,
 * for unsafe methods against non-exempt `/api/*` routes.
 */
function requiresCsrfCheck(request: NextRequest): boolean {
    if (process.env.CSRF_ENFORCE !== "true") {
        return false;
    }

    const { pathname } = request.nextUrl;
    if (!pathname.startsWith("/api/") || CSRF_SAFE_METHODS.has(request.method)) {
        return false;
    }

    return !CSRF_EXEMPT_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix)
    );
}

/** Double-submit check: the CSRF header must equal the CSRF cookie. */
function csrfTokenMatches(request: NextRequest): boolean {
    const header = request.headers.get(CSRF_HEADER_NAME);
    const cookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    return Boolean(header && cookie && header === cookie);
}

/**
 * Attach security headers to a response.
 *
 * All headers here are safe to apply uniformly to pages and API responses. HSTS
 * is production-only (it is meaningless and undesirable over plain-HTTP
 * localhost). The CSP is Report-Only so it cannot break rendering.
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
    const isProd = process.env.NODE_ENV === "production";

    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-DNS-Prefetch-Control", "off");
    response.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), interest-cohort=()"
    );

    if (isProd) {
        response.headers.set(
            "Strict-Transport-Security",
            "max-age=63072000; includeSubDomains; preload"
        );
    }

    // Content-Security-Policy (Report-Only). `'unsafe-inline'` is currently
    // required because Next.js injects inline bootstrap scripts/styles without a
    // nonce; `'unsafe-eval'` is dev-only (HMR/Turbopack). R2 hosts are allowed
    // for image display and direct browser uploads to presigned URLs.
    const scriptSrc = isProd
        ? "'self' 'unsafe-inline'"
        : "'self' 'unsafe-inline' 'unsafe-eval'";

    const csp = [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        `script-src ${scriptSrc}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://*.r2.dev https://*.r2.cloudflarestorage.com",
        "font-src 'self' data:",
        "connect-src 'self' https://*.r2.dev https://*.r2.cloudflarestorage.com",
    ].join("; ");

    // Report-Only by default (non-breaking); set CSP_MODE=enforce to promote to
    // the enforcing header once the policy is validated in staging.
    const cspHeader =
        process.env.CSP_MODE === "enforce"
            ? "Content-Security-Policy"
            : "Content-Security-Policy-Report-Only";
    response.headers.set(cspHeader, csp);

    return response;
}

/** Proxy entry point — runs for every request matched by `config.matcher`. */
export async function proxy(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    // 1. Gate guarded admin API routes.
    if (isGuardedAdminApi(pathname)) {
        const token = request.cookies.get(SESSION_COOKIE)?.value;
        const role = await getSessionRole(token);

        if (role !== ADMIN_ROLE) {
            const authenticated = Boolean(token && role);
            edgeLogger.warn("Blocked non-admin access to admin API", {
                pathname,
                authenticated,
            });

            const response = NextResponse.json(
                {
                    message: authenticated
                        ? "Admin access is required for this resource."
                        : "Authentication is required for this resource.",
                },
                { status: authenticated ? 403 : 401 }
            );
            return applySecurityHeaders(response);
        }
    }

    // 2. Enforce CSRF (double-submit) on state-changing API requests when enabled.
    if (requiresCsrfCheck(request) && !csrfTokenMatches(request)) {
        edgeLogger.warn("Blocked request failing CSRF check", {
            pathname: request.nextUrl.pathname,
            method: request.method,
        });
        return applySecurityHeaders(
            NextResponse.json({ message: "Invalid or missing CSRF token." }, { status: 403 })
        );
    }

    // 3. Pass through, adding security headers to the response.
    return applySecurityHeaders(NextResponse.next());
}

/**
 * Match all routes except Next.js internals and static assets. This keeps the
 * proxy off the hot path for images/fonts/scripts while still covering all pages
 * and API routes (needed for the admin gate and security headers).
 */
export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff|woff2|ttf|map)$).*)",
    ],
};
