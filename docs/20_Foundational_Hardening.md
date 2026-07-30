# 20 — Foundational Hardening (Phase 0)

> **Project:** UMIS / `operant-next`
> **Status:** Implemented. This document describes the Phase 0 foundational safety-net work delivered ahead of the larger refactors in `11_Refactoring_Strategy.md` and `12_Development_Master_Plan.md`.
> **Cross-references:** `18_Coding_Standards.md` (§8 Config, §9 Logging, §10 Error handling) · `16_Security_Audit.md` · `19_Future_Architecture.md` (§3.6 Auth hardening, §3.10 middleware & error boundaries) · `10_Technical_Debt_Report.md`

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [What was delivered](#2-what-was-delivered)
3. [Environment validation](#3-environment-validation)
4. [Structured logging](#4-structured-logging)
5. [Error reporting seam (Sentry-ready)](#5-error-reporting-seam-sentry-ready)
6. [Error boundaries](#6-error-boundaries)
7. [Security proxy](#7-security-proxy)
8. [Process flow](#8-process-flow)
9. [How to activate Sentry later](#9-how-to-activate-sentry-later)
10. [Follow-ups intentionally deferred](#10-follow-ups-intentionally-deferred)

---

## 1. Purpose

Phase 0 installs the **safety net** the rest of the modernisation plan depends on: fail-fast configuration, observability, graceful error handling, and a security backstop. None of it changes business behaviour; all of it is backward-compatible and additive. It is deliberately sequenced *before* the structural refactors (contributor kernel, repository pattern) so those changes land on top of working observability and error handling.

---

## 2. What was delivered

| Capability | Files | Notes |
|---|---|---|
| Environment validation | `src/lib/env.ts`, `src/instrumentation.ts` | Fail-fast at boot; aggregated report |
| Structured logging | `src/lib/logger.ts`, `src/lib/logger.edge.ts` | pino (Node) + edge-safe logger |
| Error reporting seam | `src/lib/observability.ts`, `src/lib/observability.client.ts` | Single choke point; Sentry-ready |
| Error boundaries | `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`, `(auth)/`, `(admin-protected)/`, `(director-protected)/`, `(faculty-protected)/`, `(student-protected)/` `error.tsx`; `src/components/common/route-error.tsx`, `not-found-view.tsx` | Consistent UI + reporting |
| Security proxy | `src/proxy.ts` | Headers + CSP (Report-Only) + `/api/admin` gate |
| Config reference | `.env.example` | Full, documented variable list |
| Console cleanup | `dbConnect.ts`, `auth/http.ts`, `auth/email.ts`, `notifications/email.ts` | All `console.*` → logger/seam |
| Build config | `next.config.ts` | `serverExternalPackages` for pino |

---

## 3. Environment validation

**Module:** [`src/lib/env.ts`](../src/lib/env.ts) · **Boot hook:** [`src/instrumentation.ts`](../src/instrumentation.ts)

`env.ts` is the single source of truth for every environment variable. `validateEnv()` runs once at server start-up (via the Next.js `register()` instrumentation hook) and **fails fast**, listing *every* missing/invalid variable at once rather than one at a time.

Rules encoded in the schema:
- `MONGODB_URI` and `AUTH_SECRET` (≥32 chars) are always required.
- In **production**, `ADMIN_BOOTSTRAP_SECRET` and the full Cloudflare R2 group are also required.
- The five `CLOUDFLARE_R2_*` variables are **all-or-nothing** in every environment.

Escape hatch: set `SKIP_ENV_VALIDATION=1` for build/CI steps that compile without full secrets. **Never** set it in a running production environment.

**Call sites** use typed accessors (`getMongoUri()`, `getR2Credentials()`, …) that read `process.env` lazily, so importing a module never triggers validation as a side effect.

---

## 4. Structured logging

**Modules:** [`src/lib/logger.ts`](../src/lib/logger.ts) (Node) · [`src/lib/logger.edge.ts`](../src/lib/logger.edge.ts) (edge)

Replaces all ad-hoc `console.*` calls (see `18_Coding_Standards.md` §9). Usage:

```ts
import { logger, createLogger } from "@/lib/logger";

logger.info({ formId }, "PBAS form submitted");        // structured fields first
const log = createLogger({ module: "pbas" });          // child logger with bindings
log.error({ err }, "Failed to submit");
```

- **Level** from `LOG_LEVEL` (default `info`). Pretty output in development, JSON in production.
- **Redaction:** cookies, authorization headers, passwords, tokens, secrets, and API keys are auto-redacted. Always pass sensitive data as *fields* (not string-interpolated) so redaction can find them.
- **Runtime boundary:** `logger.ts` uses pino (Node-only) and must **never** be imported by `proxy.ts`. Edge code uses `logger.edge.ts`. `pino`/`pino-pretty` are listed in `serverExternalPackages` (`next.config.ts`) so Next.js does not bundle their worker-thread transport.

---

## 5. Error reporting seam (Sentry-ready)

**Modules:** [`src/lib/observability.ts`](../src/lib/observability.ts) (server) · [`src/lib/observability.client.ts`](../src/lib/observability.client.ts) (browser)

A single function each side — `reportError(error, context)` and `reportClientError(error, context)` — that every handler and error boundary calls. Today they forward to the logger/console; they are also the **only** place Sentry needs to be wired (see §9). The API error handler (`src/lib/auth/http.ts`) and all error boundaries already route through the seam.

---

## 6. Error boundaries

Next.js renders these automatically when a segment throws:

| File | Scope |
|---|---|
| `src/app/global-error.tsx` | Root layout failure (renders its own `<html>`/`<body>`; inline styles only — `globals.css` is not loaded here) |
| `src/app/error.tsx` | Any unhandled error below the root layout |
| `src/app/not-found.tsx` | Unmatched routes / `notFound()` |
| `(auth|admin-protected|director-protected|faculty-protected|student-protected)/error.tsx` | Per route group, with a tailored title |

All group boundaries reuse [`src/components/common/route-error.tsx`](../src/components/common/route-error.tsx), which reports via `reportClientError` on mount and offers a **Try again** (reset) action. The pre-existing `faculty/profile/error.tsx` remains as a more specific boundary. In production, Next.js sanitises server-error messages (only `error.digest` is exposed), so no internal detail leaks to the browser.

---

## 7. Security proxy

**Module:** [`src/proxy.ts`](../src/proxy.ts) (edge runtime — Next.js 16 "proxy" convention, formerly `middleware`)

Defence-in-depth that runs before every matched request. It does **not** replace the per-layout page guards — it adds to them.

**Security headers (all responses):** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo locked down), `X-DNS-Prefetch-Control: off`, and `Strict-Transport-Security` (production only).

**Content-Security-Policy — Report-Only.** Ships as `Content-Security-Policy-Report-Only` so it cannot break the existing 73 pages. Violations surface in the browser console. **To promote to enforcing:** validate in staging, then rename the header to `Content-Security-Policy` in `applySecurityHeaders()`. The medium-term goal is nonce-based `script-src` (removing `'unsafe-inline'`), which is a separate, larger task.

**Admin API gate.** `/api/admin/*` requires a valid `Admin` session (401 if unauthenticated, 403 if authenticated but not admin). `/api/admin/bootstrap` is **allowlisted** because it creates the first admin before any admin session can exist (it is protected by `x-admin-bootstrap-secret` instead).

---

## 8. Process flow

```
Server start
  └─ instrumentation.register()  ── (nodejs runtime only)
       └─ validateEnv()          ── fail fast with aggregated report on error
       └─ logger.info("… server ready")

Every request (matched routes)
  └─ proxy.ts (edge)
       ├─ /api/admin/* (non-bootstrap) → verify Admin session (401/403 otherwise)
       └─ apply security headers + CSP (Report-Only) → NextResponse.next()

Request handling
  └─ route handler / server component
       └─ on unexpected error → createApiErrorResponse() → reportError() → logger(+Sentry later)

Render failure
  └─ nearest error.tsx (or global-error.tsx) → reportClientError() → console(+Sentry later)
```

---

## 9. How to activate Sentry later

Deferred deliberately (see §10). When ready, it is a small, localised change because every call site already routes through the observability seam:

1. `npm install @sentry/nextjs` then `npx @sentry/wizard@latest -i nextjs`.
2. Add `SENTRY_DSN` (and any `NEXT_PUBLIC_SENTRY_DSN`) to the schema in `src/lib/env.ts` and to `.env.example`.
3. Uncomment the `Sentry.captureException(...)` lines in `src/lib/observability.ts` and `src/lib/observability.client.ts`.

No `try/catch` blocks elsewhere need to change.

---

## 10. Follow-ups intentionally deferred

- **Sentry SDK** — the *seam* is in place; the SDK is not installed because it is inert without a DSN and changes build config. See §9.
- **CSP enforcement** — shipped Report-Only to avoid breaking existing pages; promote after staging validation, ideally with nonces.
- **Rate limiting, CSRF, session revocation** — Phase 2 security hardening (`19_Future_Architecture.md` §3.6).
- **Broader `console.*` audit** — the four meaningful source occurrences were migrated; scripts under `scripts/` still use `console.*` intentionally (standalone CLI tooling).

---

*Update this document if the logger, env contract, proxy policy, or error-boundary structure changes.*
