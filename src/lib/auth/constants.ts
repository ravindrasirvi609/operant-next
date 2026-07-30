export const ADMIN_BOOTSTRAP_SECRET_HEADER = "x-admin-bootstrap-secret";

/**
 * CSRF double-submit cookie/header names. Kept here (a dependency-free module)
 * so the server helper (`src/lib/auth/csrf.ts`), the client helper
 * (`src/lib/auth/csrf.client.ts`), and the edge proxy (`src/proxy.ts`) all
 * agree without any of them importing Node- or client-only code.
 */
export const CSRF_COOKIE_NAME = "umis_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";
