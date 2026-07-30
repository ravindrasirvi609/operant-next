# 21 — Security Hardening (Phase 2)

> **Project:** UMIS / `operant-next`
> **Status:** Implemented. Phase 2 of the modernisation plan — CSRF, rate limiting, session revocation, and configurable authz/CSP toggles. Builds on the Phase 0 proxy/logging foundation (`20_Foundational_Hardening.md`).
> **Cross-references:** `16_Security_Audit.md` (findings this addresses) · `19_Future_Architecture.md` §3.6 (target auth hardening) · `20_Foundational_Hardening.md` (proxy, env validation) · `18_Coding_Standards.md`

---

## Table of Contents

1. [Summary](#1-summary)
2. [Rate limiting](#2-rate-limiting)
3. [Session revocation](#3-session-revocation)
4. [CSRF protection (double-submit)](#4-csrf-protection-double-submit)
5. [Configurable authz compatibility mode](#5-configurable-authz-compatibility-mode)
6. [CSP promotion toggle](#6-csp-promotion-toggle)
7. [New environment variables](#7-new-environment-variables)
8. [Rollout playbook](#8-rollout-playbook)
9. [Deferred](#9-deferred)

---

## 1. Summary

Every change here is **backward-compatible and off-by-default where risky**, so it can ship without breaking existing clients.

| Capability | Mechanism | Default | Files |
|---|---|---|---|
| Rate limiting | In-memory sliding window on 8 auth endpoints | **on** (generous limits) | `src/lib/auth/rate-limit.ts` |
| Session revocation | `sessionVersion` in JWT + suspended-user check | **on** (backward-compatible) | `src/models/core/user.ts`, `src/lib/auth/session.ts`, `src/lib/auth/user.ts` |
| CSRF | Double-submit cookie + proxy enforcement | **off** (`CSRF_ENFORCE`) | `src/lib/auth/csrf.ts`, `csrf.client.ts`, `src/proxy.ts` |
| Authz compat mode | Env flag replacing a hardcode | **on** (`AUTHZ_COMPATIBILITY_MODE`) | `src/lib/authorization/service.ts` |
| CSP enforce | Env toggle in the proxy | report-only (`CSP_MODE`) | `src/proxy.ts` |

---

## 2. Rate limiting

**Module:** [`src/lib/auth/rate-limit.ts`](../src/lib/auth/rate-limit.ts)

A sliding-window limiter keyed by client IP protects the abuse-prone auth surface (credential brute force, email/enumeration spam). Exceeding a bucket throws `AuthError(429)`, surfaced as HTTP 429 by `createApiErrorResponse`.

Applied to 8 endpoints via `enforceRateLimit(request, "<bucket>")` at the top of each handler: `login`, `admin-login`, `director-login`, `forgot-password`, `reset-password`, `resend-verification`, `activate-faculty`, `activate-student`. Limits live in one place (`RATE_LIMIT_RULES`) — login family 10/15min, email family 5/15min.

**Storage:** in-process `Map`, correct for a single instance. For multi-instance/serverless, swap the store for Redis (e.g. `@upstash/ratelimit`) — the public API is storage-agnostic. `bootstrap` is intentionally excluded (secret-gated, single-use).

## 3. Session revocation

**Files:** [`user.ts` model](../src/models/core/user.ts), [`session.ts`](../src/lib/auth/session.ts), [`user.ts` service](../src/lib/auth/user.ts)

A `sessionVersion` counter (default `0`) is stored on the User, embedded in the session JWT at issue time, and compared in `getCurrentUser()`. Bumping it invalidates every previously-issued token.

- **Password reset** increments `sessionVersion`, so old sessions die when a password is reset.
- `getCurrentUser()` now also **rejects `Suspended`/inactive accounts** — previously a suspended user kept access until token expiry. (`PendingActivation` still passes through so the activation redirect works.)
- `invalidateUserSessions(userId)` is exported for force-sign-out (e.g. admin role change).

**Backward compatibility:** tokens minted before this change carry no `sessionVersion` claim → treated as `0`; existing users default to `0`. So all current sessions stay valid until the counter is first bumped.

## 4. CSRF protection (double-submit)

**Files:** [`csrf.ts`](../src/lib/auth/csrf.ts) (server), [`csrf.client.ts`](../src/lib/auth/csrf.client.ts) (browser), [`proxy.ts`](../src/proxy.ts) (enforcement)

On session creation the server issues a random, **non-`httpOnly`** `umis_csrf` cookie. Clients echo it in the `x-csrf-token` header; the proxy verifies header == cookie for state-changing `/api/*` requests. An attacker on another origin cannot read the cookie, so cannot forge the header — while same-origin scripts can. This complements the already-`sameSite: lax` session cookie with defense in depth; **no server-side state**.

**Enforcement is gated by `CSRF_ENFORCE` (default `false`)** so it can roll out safely. Exempt from checks: safe methods (GET/HEAD/OPTIONS) and the session-establishing endpoints (`/api/auth/*`, `/api/admin/bootstrap`) which run before a token exists.

Client adoption: use [`csrfFetch`](../src/lib/auth/csrf.client.ts) (a `fetch` wrapper that attaches the header on unsafe methods) for mutating requests.

## 5. Configurable authz compatibility mode

**File:** [`authorization/service.ts`](../src/lib/authorization/service.ts)

The former `const compatibilityMode = true;` hardcode — which silently grants leadership powers via the legacy `Organization.headUserId` — is now driven by `AUTHZ_COMPATIBILITY_MODE` (default `true`, preserving behaviour). Set it to `false` once every organization has explicit `LeadershipAssignment` records, to retire the legacy path.

## 6. CSP promotion toggle

**File:** [`proxy.ts`](../src/proxy.ts)

The Content-Security-Policy shipped Report-Only in Phase 0. `CSP_MODE=enforce` now promotes it to the enforcing `Content-Security-Policy` header without a code change. Validate in staging (watch for console violations) before enforcing; the medium-term goal remains nonce-based `script-src` to drop `'unsafe-inline'`.

## 7. New environment variables

See [`.env.example`](../.env.example). All optional with safe defaults:

| Variable | Default | Effect |
|---|---|---|
| `CSRF_ENFORCE` | `false` | `true` enforces double-submit CSRF in the proxy |
| `CSP_MODE` | `report-only` | `enforce` promotes the CSP to the enforcing header |
| `AUTHZ_COMPATIBILITY_MODE` | `true` | `false` disables the legacy `headUserId` authz path |

## 8. Rollout playbook

1. **Ship as-is.** Rate limiting + session revocation are active immediately and backward-compatible. Nothing else changes behaviour.
2. **CSRF:** migrate client mutations to `csrfFetch`, deploy, then set `CSRF_ENFORCE=true` in staging → verify → production.
3. **CSP:** monitor Report-Only violations; when clean, set `CSP_MODE=enforce` in staging → verify → production.
4. **Authz compat:** backfill `LeadershipAssignment` for every org, confirm no one relies on `headUserId`, then set `AUTHZ_COMPATIBILITY_MODE=false`.

## 9. Deferred

- **Redis-backed rate limiting** for multi-instance deployments (current store is per-process).
- **Upload-intent rate limiting** (auth surface covered first).
- **Nonce-based CSP** to remove `'unsafe-inline'` from `script-src`.
- **Wiring `invalidateUserSessions`** into admin role-change flows (suspension is already handled by the account-status check).

---

*Update this document when a toggle's default changes or a deferred item lands.*
