# UMIS Feature Roadmap — 1 / 3 / 6 / 12 Months

> **Companion documents:** [12_Development_Master_Plan.md](12_Development_Master_Plan.md) (phases referenced throughout) · [10_Technical_Debt_Report.md](10_Technical_Debt_Report.md) · [11_Refactoring_Strategy.md](11_Refactoring_Strategy.md) · [14_Testing_Strategy.md](14_Testing_Strategy.md) · [15_Deployment_Architecture.md](15_Deployment_Architecture.md) · [16_Security_Audit.md](16_Security_Audit.md) · [17_Performance_Optimization.md](17_Performance_Optimization.md) · [19_Future_Architecture.md](19_Future_Architecture.md) · [README.md](README.md)

This document is the product-and-engineering roadmap for `operant-next` (UMIS). It is grounded exclusively in the actual codebase as documented in [`../documentation.md`](../documentation.md) — no capabilities are invented. Every milestone either closes a known debt item (see [10_Technical_Debt_Report.md](10_Technical_Debt_Report.md)), extends a feature that already has models/routes/services, or introduces infrastructure that an existing weakness makes necessary.

---

## Table of Contents

1. [How to Read This Document](#1-how-to-read-this-document)
2. [Horizon Overview (Mermaid Timeline)](#2-horizon-overview-mermaid-timeline)
3. [Horizon 1 — Next 1 Month](#3-horizon-1--next-1-month)
4. [Horizon 2 — Next 3 Months](#4-horizon-2--next-3-months)
5. [Horizon 3 — Next 6 Months](#5-horizon-3--next-6-months)
6. [Horizon 4 — Next 12 Months](#6-horizon-4--next-12-months)
7. [Cross-Cutting Principles](#7-cross-cutting-principles)
8. [Risk Register](#8-risk-register)
9. [Maintenance of This Document](#9-maintenance-of-this-document)

---

## 1. How to Read This Document

### Two categories of work

| Category | What it is | Examples in this roadmap |
|---|---|---|
| **Product feature** | User-visible capability that extends or completes an accreditation workflow | Unicode-safe PDFs, background reminders, analytics dashboards, richer report exports, bulk operations |
| **Engineering / platform** | Infrastructure, refactoring, or tooling that the system needs to be safe, reliable, and maintainable | CSRF tokens, rate limiting, contributor-module factory, test pyramid, CI/CD, pagination, caching, observability |

Both appear in every horizon; they are labelled throughout.

### Workstream codes

Each horizon is broken into eight workstreams. The label appears in the left column of every table.

| Code | Workstream |
|---|---|
| **FEA** | Features (product) |
| **REF** | Refactoring |
| **INF** | Infrastructure |
| **SEC** | Security |
| **PERF** | Performance |
| **MON** | Monitoring & Observability |
| **SCA** | Scalability |
| **DOC** | Documentation |

### Master Plan phase alignment

Each horizon maps to one or more phases in [12_Development_Master_Plan.md](12_Development_Master_Plan.md):

| Horizon | Duration | Master Plan Phase(s) |
|---|---|---|
| 1 | 1 month | Phase 0 — Security & Data-Integrity Foundation |
| 2 | 3 months | Phase 1 — Platform Reliability & Quality |
| 3 | 6 months | Phase 2 — Feature Depth & Maintainability |
| 4 | 12 months | Phase 3 — Scale, Analytics & Platform Maturity |

---

## 2. Horizon Overview (Mermaid Timeline)

```mermaid
gantt
    title UMIS Roadmap — All Horizons
    dateFormat  YYYY-MM-DD
    axisFormat  %b %Y

    section Phase 0 · 1 Month
    SEC: CSRF + rate limiting          :active,  sec0,  2026-07-28, 2026-08-10
    SEC: Firebase rules audit + photo fix :       sec1,  2026-08-01, 2026-08-15
    INF: CI/CD baseline + env validation :        inf0,  2026-07-28, 2026-08-20
    FEA: Unicode-safe PDF generation   :          fea0,  2026-08-01, 2026-08-25
    MON: Structured logger + root error.tsx :     mon0,  2026-08-05, 2026-08-28
    INF: AcademicYear unique-active guard :       inf1,  2026-08-10, 2026-08-25

    section Phase 1 · 3 Months
    INF: Email retry/outbox            :          inf2,  2026-08-28, 2026-09-20
    INF: Migration framework           :          inf3,  2026-08-28, 2026-09-25
    REF: Contributor-module factory (kernel) :    ref0,  2026-09-01, 2026-10-15
    REF: Split pbas/service.ts         :          ref1,  2026-09-10, 2026-10-01
    PERF: Pagination primitives        :          prf0,  2026-09-15, 2026-10-20
    PERF: next/dynamic for heavy libs  :          prf1,  2026-09-01, 2026-09-20
    FEA: Background scheduler (reminders) :      fea1,  2026-09-20, 2026-10-28
    FEA: Paginated admin tables        :          fea2,  2026-10-01, 2026-11-15
    SEC: Security headers + session revocation :  sec2,  2026-09-15, 2026-10-20
    MON: Error tracking (Sentry/equiv) :          mon1,  2026-09-20, 2026-10-15

    section Phase 2 · 6 Months
    REF: Factory applied to all 6 modules :      ref2,  2026-11-15, 2027-01-15
    INF: Redis / Next cache for reference data :  inf4,  2026-11-15, 2026-12-20
    INF: Docker + staging environment  :          inf5,  2026-11-15, 2026-12-15
    FEA: AQAR completion analytics     :          fea3,  2026-11-15, 2027-01-01
    FEA: NIRF metric auto-calculation  :          fea4,  2026-12-01, 2027-01-15
    FEA: AISHE completion tracker      :          fea5,  2026-12-15, 2027-01-20
    FEA: SSS result visualisation      :          fea6,  2026-12-01, 2027-01-10
    PERF: Aggregation pipelines        :          prf2,  2026-12-01, 2027-01-20
    PERF: PDF background job           :          prf3,  2026-12-15, 2027-01-25
    SEC: Firebase Admin SDK migration  :          sec3,  2026-12-01, 2027-01-20
    SCA: MongoDB index + connection tuning :      sca0,  2026-12-15, 2027-01-25

    section Phase 3 · 12 Months
    FEA: Director analytics portal     :          fea7,  2027-01-25, 2027-03-15
    FEA: NAAC readiness score          :          fea8,  2027-02-01, 2027-04-01
    FEA: Institutional AQAR Word/PDF export :     fea9,  2027-02-15, 2027-04-15
    FEA: SSR multi-cycle analytics     :          fea10, 2027-03-01, 2027-05-01
    FEA: BOS digital approval workflow :          fea11, 2027-04-01, 2027-06-01
    FEA: Bulk evidence package download :         fea12, 2027-03-15, 2027-05-15
    REF: Large component decomposition :          ref3,  2027-01-25, 2027-04-15
    REF: Unified form paradigm         :          ref4,  2027-04-01, 2027-06-01
    INF: CDN + advanced deployment     :          inf6,  2027-04-01, 2027-06-15
    MON: SLO/SLA + alerting            :          mon2,  2027-03-01, 2027-07-28
    SCA: Connection pooling + query budget : sca1, 2027-04-01, 2027-07-28
```

---

## 3. Horizon 1 — Next 1 Month

**Master Plan alignment:** Phase 0 — Security & Data-Integrity Foundation

**Goal:** Close the P0 security and data-integrity risks identified in [16_Security_Audit.md](16_Security_Audit.md) and [10_Technical_Debt_Report.md](10_Technical_Debt_Report.md) before any feature work lands. Establish the CI/CD baseline so all subsequent changes pass automated gates. None of these items are optional — they protect real regulatory documents and real user credentials.

### 3.1 Features (product)

| ID | Item | Description | Existing anchors |
|---|---|---|---|
| F-1.1 | **Unicode-safe PDF generation** | Replace the hand-rolled PDF byte-builder in `src/lib/report-templates/pdf.ts` with a maintained library (e.g. `pdf-lib` or `pdfkit`) that supports full Unicode. Eliminates silent stripping of Indian-language names and diacritics in official PBAS, AQAR, faculty, and CAS PDFs. All four `*-report-pdf.ts` modules benefit. | `lib/report-templates/pdf.ts`, `lib/pbas/report-pdf.ts`, `lib/faculty/report-pdf.ts`, `lib/aqar/report-pdf.ts`, `lib/aqar-cycle/report-pdf.ts` — §17, §27 |

### 3.2 Refactoring (engineering)

| ID | Item | Description |
|---|---|---|
| R-1.1 | **AcademicYear unique-active enforcement** | Add a Mongoose validator (or pre-save hook) on `AcademicYear` that ensures at most one document has `isActive = true` at any time. Fixes the data-integrity gap noted in §27; prevents misrouted plan assignments. |
| R-1.2 | **Audit-log connection safety** | Wrap `createAuditLog()` calls (`src/lib/audit/service.ts`) so the function issues its own `dbConnect()` before writing and — where Mongoose supports it — participates in any in-flight session/transaction. Prevents silent audit-write failures on cold requests. |
| R-1.3 | **Photo-endpoint MIME/size verification** | Add the intent/finalize MIME/size/checksum check to `POST /api/faculty/photo` and `POST /api/student/photo`, matching the policy already enforced by the document upload pipeline (`src/lib/upload/policy.ts`). |

### 3.3 Infrastructure (engineering)

| ID | Item | Description |
|---|---|---|
| I-1.1 | **Environment-schema validation** | Add a Zod-based `src/lib/env.ts` that validates all required env vars at startup (mirrors `getRequiredEnv` style already in `src/lib/auth/config.ts`). Fail fast on missing secrets rather than lazily at first use. |
| I-1.2 | **CI/CD baseline** | Add a GitHub Actions (or equivalent) workflow that runs `npm ci`, `npm run lint`, `npm test`, and `npm run build` on every pull-request push. Gate merges on green. No fancy infra needed at this stage — just the pipeline and a working `npm test` output. See [15_Deployment_Architecture.md](15_Deployment_Architecture.md). |
| I-1.3 | **Remove stale root artifacts** | Delete `legacy_models.txt`, `new_models.txt`, and fix the hard-coded absolute path in `scripts/ts-alias-loader.mjs`. These do not reflect the implemented 188-model schema and mislead contributors. |

### 3.4 Security (engineering)

| ID | Item | Description | Severity in §20 |
|---|---|---|---|
| S-1.1 | **CSRF protection** | Introduce a double-submit cookie or `Origin`-check pattern for all state-changing API routes (`POST`, `PATCH`, `PUT`, `DELETE`). The current `sameSite: "lax"` cookie alone is insufficient against cross-origin navigation attacks. See [16_Security_Audit.md](16_Security_Audit.md). | High |
| S-1.2 | **Rate limiting on auth/reset/upload paths** | Add in-memory (or Redis-backed when available) rate limiting on `POST /api/auth/login`, `/admin-login`, `/director-login`, `/forgot-password`, `/resend-verification`, `/activate-faculty`, `/activate-student`, and `POST /api/documents` (issue-upload). Prevent brute-force and email-abuse vectors. | High |
| S-1.3 | **Firebase Storage rules audit** | Audit and document the Firebase Storage Security Rules for the bucket referenced by `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`. Ensure upload paths enforce per-user ownership, file-type restrictions, and size caps matching `src/lib/upload/policy.ts`. Rules live outside this repo — track them in a companion file under `docs/`. | Medium |

### 3.5 Performance (engineering)

No performance changes in this horizon. Foundation work takes priority.

### 3.6 Monitoring (engineering)

| ID | Item | Description |
|---|---|---|
| M-1.1 | **Structured logger** | Replace all `console.log/error/info` calls with a thin structured-logging wrapper (`src/lib/logger.ts`) that emits JSON in production and human-readable output in development. This is a prerequisite for log aggregation in later horizons. |
| M-1.2 | **Root error.tsx and not-found.tsx** | Add `src/app/error.tsx` (client boundary) and `src/app/not-found.tsx` alongside per-group `error.tsx` files for the four protected route groups. Replaces the framework default blank screen for unhandled server errors. |

### 3.7 Scalability (engineering)

No scalability changes in this horizon.

### 3.8 Documentation (engineering)

| ID | Item | Description |
|---|---|---|
| D-1.1 | **Security findings closure log** | Update [16_Security_Audit.md](16_Security_Audit.md) to record which S-1.x items are resolved and any residual risk. |
| D-1.2 | **Env variable reference update** | Extend §19 of `../documentation.md` with the new env-schema validation contract and document the Firebase Storage rules companion file. |

---

## 4. Horizon 2 — Next 3 Months

**Master Plan alignment:** Phase 1 — Platform Reliability & Quality

**Goal:** Build the engineering foundations that make subsequent feature work safe and sustainable: a test pyramid, a proper deployment pipeline, email reliability, pagination, and the first step of the contributor-module factory. Begin selective performance improvements. Introduce the background-job infrastructure that the product roadmap depends on.

### 4.1 Features (product)

| ID | Item | Description | Existing anchors |
|---|---|---|---|
| F-2.1 | **Background scheduler for deadline reminders** | Deadline reminders for PBAS, CAS, and AQAR are currently computed lazily on each `GET /api/notifications` call (§3, §17). Introduce a lightweight scheduler (e.g. `node-cron` running inside the Node process, or an external cron hitting a secured internal endpoint) that computes and writes reminders once per day. Removes the per-request cost and ensures reminders reach users who don't poll notifications. | `lib/notifications/service.ts`, `lib/pbas/service.ts` (14/7/3/1-day reminder logic already present) |
| F-2.2 | **Paginated and server-searched admin tables** | All admin and director list endpoints currently return the full authorized set (§21). Add `page`, `pageSize`, and `q` (free-text search) query parameters — starting with the highest-volume collections: `GET /api/admin/users`, `GET /api/director/faculty`, `GET /api/director/students`, and the six criterion-module plan/assignment lists. Pair with updated UI controls. | All `*-manager.tsx` components, director dashboard |
| F-2.3 | **PBAS aggregate scoring report** | Add an admin-level `GET /api/admin/pbas/aggregate-report?academicYearId=` that returns all submitted/approved PBAS forms for a year with their API scores in a structured JSON. Expose an Export to Excel button in the admin PBAS console using the existing client-side `xlsx` library. Feeds institutional NAAC C2/C3 evidence. | `lib/pbas/service.ts`, `FacultyPbasForm` model, existing xlsx client-side pattern |
| F-2.4 | **CAS eligibility self-check** | Surface a faculty-facing eligibility banner in the CAS dashboard that pre-checks the current user's approved PBAS count, total experience from faculty records, and applicable promotion rule — before they formally apply. Uses data already available in `lib/cas/service.ts` (`getCasEligibility`). | `lib/cas/service.ts`, `cas-promotion-rule`, `faculty-pbas-form`, faculty records |

### 4.2 Refactoring (engineering)

| ID | Item | Description |
|---|---|---|
| R-2.1 | **Contributor-module factory — kernel** | Extract a generic `createContributorModule(config)` factory in `src/lib/contributor-module/` that generates the shared plan→assignment→contribution→submit→review lifecycle. Use Teaching-Learning as the reference implementation. The kernel provides: typed service methods, Zod schemas, workflow registration, scope-block helpers, and the canonical audit/notification calls. See [11_Refactoring_Strategy.md](11_Refactoring_Strategy.md). |
| R-2.2 | **Split `lib/pbas/service.ts`** | Decompose the ~2500-line PBAS service into focused sub-modules: `pbas/form-service.ts` (create/update/delete), `pbas/workflow-service.ts` (submit/review/approve), `pbas/scoring-service.ts` (API score calculation), `pbas/report-service.ts` (PDF/export). No behavior change. |
| R-2.3 | **Shared pagination/search utility** | Add `src/lib/db/pagination.ts` with a reusable `buildPaginatedQuery(model, filter, opts)` helper to back F-2.2 and all future paginated endpoints consistently. |

### 4.3 Infrastructure (engineering)

| ID | Item | Description |
|---|---|---|
| I-2.1 | **Email retry/outbox** | Add an `EmailOutbox` collection (or use the existing `Notification` document's `emailStatus` field) with an exponential-backoff retry worker. Failed sends (Resend API errors) are retried up to 3 times before being marked permanently failed. Eliminates silent notification loss. |
| I-2.2 | **Lightweight migration framework** | Replace the untracked one-shot scripts in `scripts/` with a migration runner that tracks which scripts have executed (a `_migrations` MongoDB collection). Modelled on the existing idempotent backfill style but with a central ledger. See [15_Deployment_Architecture.md](15_Deployment_Architecture.md). |
| I-2.3 | **Containerization (Dockerfile + compose)** | Add a production-ready `Dockerfile` (Node 20 LTS, multi-stage build) and a `docker-compose.yml` for local development with a Mongo container. Prerequisite for the staging environment in Horizon 3. |

### 4.4 Security (engineering)

| ID | Item | Description |
|---|---|---|
| S-2.1 | **Security response headers** | Add `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin` via a Next.js config `headers()` export or a thin middleware. See [16_Security_Audit.md](16_Security_Audit.md). |
| S-2.2 | **Server-side session revocation list** | Add a `RevokedSession` collection keyed on JWT `jti` (introduce `jti` claim to new tokens). Check it in `getCurrentUser()`. Allows logout-all-devices and force-invalidate on password change or suspend. Acceptable latency: one indexed Mongo lookup per request. |
| S-2.3 | **Legacy `headUserId` authorization toggle** | Add a `MasterData` config key `authz.legacyHeadUserIdEnabled` (default `true` during rollout). Thread it through `resolveAuthorizationProfile()`'s `compatibilityMode` flag so an admin can disable the legacy path once `LeadershipAssignment` records are fully populated by the existing backfill script. |

### 4.5 Performance (engineering)

| ID | Item | Description |
|---|---|---|
| P-2.1 | **`next/dynamic` for React Flow and xlsx** | Lazy-import `@xyflow/react` (only used in `hierarchy-manager.tsx`) and `xlsx` (used in 5 components) via `next/dynamic`. Reduces the initial admin bundle sent to users who never visit the hierarchy or bulk-upload pages. See [17_Performance_Optimization.md](17_Performance_Optimization.md). |
| P-2.2 | **Director dashboard aggregation** | Convert the director dashboard's 11-module×2-query fan-out (`lib/director/dashboard.ts`) to a single MongoDB `$facet` aggregation pipeline. Replaces N+1 queries with one round-trip. |

### 4.6 Monitoring (engineering)

| ID | Item | Description |
|---|---|---|
| M-2.1 | **Error tracking integration** | Integrate Sentry (or a compatible self-hosted alternative) via `@sentry/nextjs`. Capture unhandled server-component errors, API 5xx responses, and client boundary fallbacks. Wire to the structured logger from M-1.1. |
| M-2.2 | **Audit-log query expansion** | Extend `GET /api/admin/audit-logs` with additional filters: `actorRole`, `status` transition, and `module`. Expose a CSV export for compliance reports. |

### 4.7 Scalability (engineering)

| ID | Item | Description |
|---|---|---|
| SC-2.1 | **Scope-block index verification** | Verify (and add where missing) compound indexes on the scope-block fields (`scopeDepartmentId`, `scopeInstitutionId`, `scopeOrganizationIds`) across the eight plan/assignment model families. These back every `buildAuthorizedScopeQuery` call — missing indexes cause full-collection scans under load. |

### 4.8 Documentation (engineering)

| ID | Item | Description |
|---|---|---|
| D-2.1 | **Testing strategy execution** | Begin implementing the test pyramid defined in [14_Testing_Strategy.md](14_Testing_Strategy.md): unit tests for the workflow engine (`lib/workflow/engine.ts`), authorization service (`lib/authorization/service.ts`), and the PBAS scoring logic. Target: 40+ unit tests. |
| D-2.2 | **Deployment architecture update** | Update [15_Deployment_Architecture.md](15_Deployment_Architecture.md) to reflect the new Dockerfile, migration framework, and CI/CD pipeline. |

---

## 5. Horizon 3 — Next 6 Months

**Master Plan alignment:** Phase 2 — Feature Depth & Maintainability

**Goal:** Deliver the analytics, richer reporting, and completion-tracking features that IQAC administrators and directors need most. Complete the contributor-module factory refactor. Introduce caching and background job processing to handle full-cycle workloads. Harden the upload path by adopting Firebase Admin SDK.

### 5.1 Features (product)

| ID | Item | Description | Existing anchors |
|---|---|---|---|
| F-3.1 | **AQAR C1–C7 completion analytics dashboard** | Add a new admin/IQAC dashboard page showing a per-criterion completion heatmap for the active AQAR cycle — counts of Draft / Submitted / Approved assignments per module mapped to C1–C7, plus a cycle-level readiness percentage. Uses the `AqarCycle` snapshot data already in `lib/aqar-cycle/service.ts`. | `lib/aqar-cycle/service.ts`, `reporting/naac-criteria-mapping`, AQAR cycle models |
| F-3.2 | **NIRF metric auto-calculation** | Wire the existing `NirfMetricValue` model to auto-populate calculable metrics (student enrollment, faculty count, research output count, placement percentages) from the NAAC Metric Warehouse `generateNaacMetricValues()` pipeline, reducing manual data entry in NIRF cycles. | `lib/accreditation/service.ts`, `reporting/nirf-metric-value`, `lib/naac-metric-warehouse/service.ts` |
| F-3.3 | **AISHE survey completion tracker** | Add a visual progress indicator in the `admin/accreditation` AISHE section showing how many of the 8 statistical categories (`AisheStudentEnrollment`, `AisheFacultyStatistics`, `AisheFinanceStatistics`, etc.) have been populated for the current cycle, with per-section edit links. | `reporting/aishe-*` models, `lib/accreditation/service.ts` |
| F-3.4 | **SSS result visualisation** | After survey close, display the `SssResultAnalytics` data (overall satisfaction index, per-question mean scores, response rate) as a tabular + bar-chart breakdown in the admin SSS console and in the director reports section. Uses data already computed by `lib/accreditation/service.ts`. | `engagement/sss-result-analytics`, `lib/accreditation/service.ts` |
| F-3.5 | **NAAC Metric Warehouse — scheduled generation** | Schedule the `generateNaacMetricValues()` job (currently on-demand via admin button) to run nightly using the background scheduler introduced in F-2.1. Store the last-run timestamp and surface it in the admin UI as a "last refreshed" indicator. | `lib/naac-metric-warehouse/service.ts`, `reporting/naac-metric-sync-run` |
| F-3.6 | **PBAS / CAS bulk deadline management** | Add an admin operation to extend the PBAS submission deadline for an entire department or academic year in a single action (currently one record at a time via `MasterData`). Reuse the paginated list from F-2.2. | `lib/pbas/service.ts`, `core/master-data` |

### 5.2 Refactoring (engineering)

| ID | Item | Description |
|---|---|---|
| R-3.1 | **Apply contributor-module factory to all 6 modules** | Using the kernel built in R-2.1, migrate Research-Innovation, Infrastructure-Library, Student-Support-Governance, Governance-Leadership-IQAC, and Institutional-Values-Best-Practices to the factory. Eliminates hundreds of duplicated lines. Teaching-Learning (the reference) remains unchanged as a reference implementation. See [11_Refactoring_Strategy.md](11_Refactoring_Strategy.md). |
| R-3.2 | **Split `lib/accreditation/service.ts`** | Decompose the large accreditation service into focused sub-services: `accreditation/aishe-service.ts`, `accreditation/nirf-service.ts`, `accreditation/compliance-service.ts`, `accreditation/sss-service.ts`. No behavior change. |
| R-3.3 | **Pagination applied to remaining list endpoints** | Apply the `buildPaginatedQuery` helper from R-2.3 to the remaining high-volume reads: NAAC metric values, audit logs (already partially paginated — extend), SSR assignments, evidence review queue. |

### 5.3 Infrastructure (engineering)

| ID | Item | Description |
|---|---|---|
| I-3.1 | **Response caching for reference / master data** | Use Next.js Data Cache tags (or a Redis layer) to cache reads of `AcademicYear`, `Department`, `Institution`, `AcademicProgram`, `MasterData`, and `ReferenceMasters` — collections that change rarely but are fetched on every admin page render. Invalidate cache on admin write. See [17_Performance_Optimization.md](17_Performance_Optimization.md). |
| I-3.2 | **Staging environment** | Stand up a staging deployment (separate MongoDB database, same Docker image, separate Firebase project/bucket). Wire CI/CD to deploy `main` → staging automatically; require manual promotion to production. |
| I-3.3 | **Integration test suite** | Add API-level integration tests (Vitest + a test-scoped MongoDB via `mongodb-memory-server`) for the complete workflow lifecycle of at least two modules (PBAS and one contributor module). See [14_Testing_Strategy.md](14_Testing_Strategy.md). |

### 5.4 Security (engineering)

| ID | Item | Description |
|---|---|---|
| S-3.1 | **Firebase Admin SDK for upload verification** | Replace the current client-SDK-only upload verification (which re-fetches the file via public download URL and relies on `NEXT_PUBLIC_FIREBASE_*` keys) with Firebase Admin SDK (`firebase-admin`) on the server. Enables proper service-account verification of uploads without exposing write credentials to the client. See [16_Security_Audit.md](16_Security_Audit.md). |
| S-3.2 | **Penetration test / security self-audit** | Conduct a structured security review against the items in [16_Security_Audit.md](16_Security_Audit.md) using OWASP ASVS Level 1 as a checklist. Record results and open work items. |

### 5.5 Performance (engineering)

| ID | Item | Description |
|---|---|---|
| P-3.1 | **Aggregation pipelines for AQAR-cycle and NAAC snapshot** | Convert the `generateAqarCycleSnapshot()` and `generateNaacMetricValues()` fan-outs (currently 20–25 sequential collection queries) to MongoDB aggregation pipelines with `$lookup`/`$group`/`$project` stages. Reduces round-trip count and enables server-side limiting. See [17_Performance_Optimization.md](17_Performance_Optimization.md). |
| P-3.2 | **PDF generation moved off the request thread** | Move large PDF builds (`aqar-cycle/report-pdf.ts`, `faculty/report-pdf.ts`) into the background job queue from F-2.1. Return a job-ID to the client; poll for completion; stream the result. Eliminates request-thread blocking for multi-page cycle reports. |

### 5.6 Monitoring (engineering)

| ID | Item | Description |
|---|---|---|
| M-3.1 | **Request latency instrumentation** | Add per-route latency logging (p50/p95 targets) using the structured logger from M-1.1. Tag by module, action type, and user role. Feed into the error-tracking dashboard or a Prometheus scrape endpoint. |
| M-3.2 | **Background job health endpoint** | Expose `GET /api/admin/system/jobs` showing the last-run time and status of each scheduled job (reminders, NAAC generation). Surface in the `admin/system` console already present. |

### 5.7 Scalability (engineering)

| ID | Item | Description |
|---|---|---|
| SC-3.1 | **MongoDB connection pool tuning** | Tune `mongoose.connect()` options (`maxPoolSize`, `minPoolSize`, `serverSelectionTimeoutMS`) based on measured concurrency from M-3.1. Document the tuning rationale for each deployment tier. |
| SC-3.2 | **`loadedConnection` per-request guard** | Ensure every service function that issues queries calls `dbConnect()` or receives a pre-connected context — close the gap where audit writes silently skip connection checks (extended from R-1.2). |

### 5.8 Documentation (engineering)

| ID | Item | Description |
|---|---|---|
| D-3.1 | **[14_Testing_Strategy.md](14_Testing_Strategy.md) execution update** | Update the testing strategy document to reflect which layers now have coverage, current test counts, and the integration test patterns established in I-3.3. |
| D-3.2 | **[17_Performance_Optimization.md](17_Performance_Optimization.md) update** | Record measured baselines (P50/P95 latency per key page) before and after P-3.1/P-3.2. Use as the baseline for Horizon 4 SLO work. |
| D-3.3 | **Contributor module factory guide** | Add a developer guide section in `../documentation.md` §25 explaining how to create a new accreditation criterion module using the factory, replacing the current manual 7-step "add a new feature" walkthrough. |

---

## 6. Horizon 4 — Next 12 Months

**Master Plan alignment:** Phase 3 — Scale, Analytics & Platform Maturity

**Goal:** Deliver the high-value analytical and cross-module features that transform UMIS from a data-collection tool into a genuine decision-support platform for institutional accreditation. Reach maintainability maturity by completing refactoring and retiring technical debt. Define and enforce service-level objectives.

### 6.1 Features (product)

| ID | Item | Description | Existing anchors |
|---|---|---|---|
| F-4.1 | **Director analytics portal** | Extend `director/reports` with a visual analytics section: PBAS median API score by department, CAS pipeline (applications by stage), AQAR criterion completion trend (year-over-year), and SSS satisfaction trend. All driven by aggregated data the system already holds. | `lib/director/dashboard.ts`, PBAS/CAS/AQAR/SSS models |
| F-4.2 | **NAAC accreditation readiness score** | Compute a composite "accreditation readiness" percentage for the active NAAC cycle: weighted by C1–C7 criteria, using NAAC Metric Warehouse values, SSR completion, and AQAR cycle state. Surface in the admin and director dashboards as a single prominent indicator. | `lib/naac-metric-warehouse/service.ts`, `NaacMetricCycle`, `SsrCycle`, `AqarCycle` |
| F-4.3 | **Institutional AQAR — Word/PDF export** | Add a structured multi-section export of the institutional AQAR cycle snapshot in both PDF (via the PDF library from F-1.1) and a `.docx` format (using `docx` or similar library). Each section maps to the C1–C7 NAAC criteria blocks. Replaces the current single-format ASCII-only output. | `lib/aqar-cycle/report-pdf.ts`, `AqarCycle` snapshot, `NaacCriteriaMapping` |
| F-4.4 | **SSR multi-cycle analytics** | In `admin/ssr`, add a cycle-comparison view: metric response completion rates and approved counts across the current and prior SSR cycles. Uses the `SsrCycle → SsrMetric → SsrMetricResponse` hierarchy already modelled. | `reporting/ssr-*` models |
| F-4.5 | **BOS digital approval workflow** | Extend the existing BOS (`Board of Studies`) meeting and decision models to add a formal approval workflow: minutes draft → committee review → principal approval → signed/archived. Reuses the generic workflow engine. | `academic/curriculum-*` BOS models (`bos-meeting`, `bos-decision`), workflow engine |
| F-4.6 | **Bulk accreditation evidence package download** | Allow admins to download a structured ZIP archive of all approved evidence documents for a given NAAC criterion, academic year, and department — organized by NAAC metric code. Builds on the existing `Document` registry and Firebase Storage download URLs. | `reference/document`, `naac-metric-definition`, evidence review models |
| F-4.7 | **PBAS/CAS historical trend analysis** | Add a faculty-facing multi-year PBAS API score chart and a CAS application history timeline in `faculty/pbas` and `faculty/cas`. Aggregate data is already persisted in `FacultyPbasForm` and `CasPromotionHistory`. | `core/faculty-pbas-form`, `core/cas-promotion-history` |
| F-4.8 | **Faculty AQAR contribution comparison** | Add an admin view comparing faculty AQAR contribution indices across departments for a given year — a ranked table with drill-down to individual submissions. Feeds NAAC C2/C3 institutional evidence. | `core/aqar-application`, `lib/aqar/service.ts` |

### 6.2 Refactoring (engineering)

| ID | Item | Description |
|---|---|---|
| R-4.1 | **Large component decomposition** | Break `faculty-workspace-form.tsx` (~the largest component) into per-section sub-components (Qualifications, TeachingLoad, Publications, etc.) each with its own `useFieldArray` scope. Similarly decompose `FacultyPbasDashboard` and `CasApplicationDashboard`. |
| R-4.2 | **Unified form paradigm** | Document and enforce a single form pattern: `react-hook-form` + `zodResolver` for all validated forms; plain `useState` objects only for non-form UI state. Migrate remaining plain-object CRUD forms in `*-manager.tsx` components to rhf where field-level errors are needed. |
| R-4.3 | **Remove dead-code 410 endpoints** | Remove the client-side code that calls retired `410` endpoints (`/api/auth/register`, `/api/faculty/evidence`, `/api/student/resume`, `/api/director/students/approvals`). Keep the server 410 handlers for API compatibility but purge dead client invocations. |
| R-4.4 | **Role enum cleanup** | Rename or deprecate legacy `User.role` enum values (`PRO`, `NSS`, `Sports`, `Swayam`, `Placement`, `Director`) that are not the real access-control mechanism. Replace with governance-committee memberships or document the intended mapping explicitly. |

### 6.3 Infrastructure (engineering)

| ID | Item | Description |
|---|---|---|
| I-4.1 | **CDN for static and Firebase-served assets** | Route Firebase Storage download URLs through a CDN (Firebase Hosting CDN or Cloudflare) for uploaded documents and photos. Reduces latency for evidence review and faculty photo loading in multi-tenant setups. |
| I-4.2 | **Feature flags / MasterData toggle system** | Formalize the `MasterData` config store as a typed feature-flag system with a typed accessor, admin UI toggle, and documented keys. Enables gradual rollout of S-2.3 (headUserId toggle), scheduled generation, and future A/B capabilities. |
| I-4.3 | **End-to-end test suite** | Add Playwright (or equivalent) e2e tests covering the critical user journeys: admin creates a PBAS plan → faculty submits → director reviews → admin approves; student uploads evidence → admin verifies. See [14_Testing_Strategy.md](14_Testing_Strategy.md). |

### 6.4 Security (engineering)

| ID | Item | Description |
|---|---|---|
| S-4.1 | **Formal security audit** | Commission or conduct a structured external/internal security audit against the production deployment. Use OWASP ASVS Level 2 as the benchmark. Findings feed the next planning cycle. |
| S-4.2 | **Bootstrap length oracle fix** | Fix `secretsMatch` in `POST /api/admin/bootstrap` to remove the `length` pre-check before `timingSafeEqual`, eliminating the secret-length information leak noted in §20. |

### 6.5 Performance (engineering)

| ID | Item | Description |
|---|---|---|
| P-4.1 | **Sub-100ms P95 for key admin pages** | Using baselines from M-3.1 and D-3.2, drive the P95 page-render latency for the five highest-traffic admin pages (dashboard, users, PBAS admin, AQAR admin, audit logs) below 100 ms through combined caching, aggregation, and pagination improvements. |
| P-4.2 | **Client bundle audit and splitting** | Run a Webpack/Turbopack bundle analysis. Apply code splitting and `next/dynamic` to any admin-only component that exceeds 50 kB. Target: faculty and student portals should receive no admin-specific JS. |

### 6.6 Monitoring (engineering)

| ID | Item | Description |
|---|---|---|
| M-4.1 | **SLO/SLA definition and alerting** | Define service-level objectives (availability, P95 latency, error rate) per portal. Wire alerts (email/Slack) via the error-tracking platform when objectives are breached. |
| M-4.2 | **Business metric instrumentation** | Track domain-level events (PBAS submissions per day, CAS applications by month, SSR completion rate) as structured log events, queryable from the monitoring dashboard. Feeds institutional reporting. |

### 6.7 Scalability (engineering)

| ID | Item | Description |
|---|---|---|
| SC-4.1 | **Query budget enforcement** | Add a Mongoose `pre('find')` hook (or service-layer guard) that logs a warning when a query returns more than 500 documents without pagination. Prevents regressions as data volume grows. |
| SC-4.2 | **Horizontal scaling readiness** | Audit and document any process-local state (in-memory rate-limiter counters, scheduler lock) that would fail under multiple Node instances. Replace with Redis-backed equivalents where applicable. See [19_Future_Architecture.md](19_Future_Architecture.md). |

### 6.8 Documentation (engineering)

| ID | Item | Description |
|---|---|---|
| D-4.1 | **Full docs suite sync** | Review and update all 19 documents in the `/docs` suite against the code changes shipped over the 12-month horizon. Resolve any document-vs-code disagreements (per the maintenance rule in [README.md](README.md)). |
| D-4.2 | **[19_Future_Architecture.md](19_Future_Architecture.md) gap review** | Compare the current state against the future-architecture north star. Document which target-architecture patterns have been achieved and which remain as candidates for the next planning cycle. |
| D-4.3 | **Onboarding guide update** | Update `../documentation.md` §25 (Developer Guide) to reflect the factory, unified form paradigm, migration framework, and CI/CD process. Reduce onboarding time to under half a day. |

---

## 7. Cross-Cutting Principles

These rules apply to every milestone in every horizon and are not repeated per-item.

1. **No big-bang rewrites.** Every change is incremental and deployed behind a working build. The live system serves real regulatory submissions.
2. **Feature work is gated on Phase 0 security.** No new product features ship until S-1.1 (CSRF), S-1.2 (rate limiting), and I-1.1 (env validation) are merged and green in CI.
3. **All new endpoints follow the canonical handler shape** documented in `../documentation.md` §9.1: guard → parse → service → `createApiErrorResponse`.
4. **All new service code uses `dbConnect()`** explicitly at entry and calls `createAuditLog` within the same Mongoose session where possible (R-1.2 pattern).
5. **All new API routes include pagination** using the shared helper from R-2.3. Full-set returns are not acceptable for new list endpoints.
6. **Tests are required for new workflow transitions and scoring logic.** Coverage targets per horizon are set in [14_Testing_Strategy.md](14_Testing_Strategy.md).
7. **Cross-references are maintained.** When a debt item from [10_Technical_Debt_Report.md](10_Technical_Debt_Report.md) is closed, update that document. When a refactoring from [11_Refactoring_Strategy.md](11_Refactoring_Strategy.md) is completed, mark it done.
8. **Unicode safety is non-negotiable in official documents.** Any new PDF, Word, or export that could contain Indian-language names or diacritics must use the Unicode-capable library introduced in F-1.1.

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase 0 security work delayed by competing feature pressure | Medium | High — live security exposure | Engineering manager must gate all feature merges until S-1.1/S-1.2 are green |
| PDF library introduction (F-1.1) breaks existing report formatting | Medium | Medium — official documents | Introduce new library alongside existing builder; run both and diff output before cutover |
| Contributor-module factory (R-2.1) introduces regressions in the 6 existing modules | Medium | High | Comprehensive integration tests for each module (I-3.3) before factory migration; Teaching-Learning factory conversion is the last step |
| Background scheduler (F-2.1) causes duplicate notifications | Low | Medium | Use the existing `dedupeKey` mechanism in `lib/notifications/service.ts`; add idempotency check in job |
| Firebase Admin SDK migration (S-3.1) requires new service-account key management | Low | Medium | Use environment variable injection; never commit keys; document in [15_Deployment_Architecture.md](15_Deployment_Architecture.md) |
| MongoDB aggregation pipeline complexity (P-3.1) increases maintenance cost | Low | Low | Document pipeline stages inline; add targeted integration tests |
| Pagination rollout (F-2.2) breaks existing client components that assume full-set responses | Medium | Medium | Use backwards-compatible defaults (`pageSize=1000` until UI is updated); coordinate API and UI changes in same PR |

---

## 9. Maintenance of This Document

This document is a living artefact. Per the maintenance rules in [README.md](README.md):

- When a milestone is delivered, mark it completed with the delivery date and the associated PR/commit reference.
- When a milestone is deferred or descoped, move it to the next horizon and record the reason.
- When new debt is discovered, add it to [10_Technical_Debt_Report.md](10_Technical_Debt_Report.md) first, then schedule it in this roadmap.
- Re-review and re-prioritize this document at the start of each horizon.
- When the code and this document disagree, the code is the source of truth — update this document.

---

*Grounded in `../documentation.md` as reviewed. All model names, route paths, service files, and component names refer to the implemented codebase under `c:\Users\C839248\operant-next\src`.*
