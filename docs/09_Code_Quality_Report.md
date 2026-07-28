# 09 — Code Quality Report

> **Project:** UMIS (`operant-next`) · Next.js 16 App Router + MongoDB/Mongoose
> **Scope:** Code quality, technical structure, frontend issues, backend issues, database issues
> **Authoritative grounding:** `documentation.md` §20/21/22/23/27 — confirmed against live source files
> **Cross-references:** [02_Current_Architecture.md](02_Current_Architecture.md) · [05_Database_Architecture.md](05_Database_Architecture.md) · [06_API_Documentation.md](06_API_Documentation.md) · [07_Frontend_Architecture.md](07_Frontend_Architecture.md) · [11_Refactoring_Strategy.md](11_Refactoring_Strategy.md) · [10_Technical_Debt_Report.md](10_Technical_Debt_Report.md)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Code Quality — Structural Issues](#2-code-quality--structural-issues)
   - 2.1 Duplicate Code: the Six Near-Identical Criterion Modules
   - 2.2 Very Large Files
   - 2.3 Repeated Business Logic
   - 2.4 Tight Coupling and Poor Separation of Concerns
   - 2.5 Dead / Retired Code
   - 2.6 Stale / Unused Artifacts
   - 2.7 Circular-Dependency Risk
   - 2.8 Naming Inconsistencies
   - 2.9 Folder and Route-Group Inconsistencies
   - 2.10 Poor / Missing Abstractions
3. [Frontend Issues](#3-frontend-issues)
   - 3.1 Component Design and Reusability
   - 3.2 Hooks and State
   - 3.3 Context and Global State
   - 3.4 Routing
   - 3.5 Forms — Two-Paradigm Problem
   - 3.6 UI Consistency and Accessibility
   - 3.7 Responsiveness
   - 3.8 Missing Error and Loading Boundaries
4. [Backend Issues](#4-backend-issues)
   - 4.1 API Organisation
   - 4.2 Controllers / Services
   - 4.3 Database Access Pattern
   - 4.4 Input Validation
   - 4.5 Error Handling
   - 4.6 Logging
   - 4.7 Security
   - 4.8 Scalability
5. [Database Issues](#5-database-issues)
   - 5.1 Schema Design
   - 5.2 Relationships and No Referential Integrity
   - 5.3 Constraints
   - 5.4 Missing or Unverified Indexes
   - 5.5 Query Optimisation and N+1 Patterns
   - 5.6 Data Duplication via the Scope Block
   - 5.7 Normalisation Trade-Off
   - 5.8 Performance
6. [Prioritised Summary Table](#6-prioritised-summary-table)

---

## 1. Executive Summary

UMIS is a well-architected modular monolith with strong domain fidelity, a consistent layering convention (route → service → model), and excellent reuse of cross-cutting infrastructure (one workflow engine, one authorisation service, one error mapper). These are genuine strengths.

Against those strengths stand a set of structural and quality problems that, left unaddressed, will increasingly impede development velocity and reliability:

- Six feature modules share an almost-identical codebase (~10,000 lines) rather than a shared factory.
- Three files alone — `pbas/service.ts` (2 199 lines), `research-innovation/service.ts` (2 407 lines), and `faculty-workspace-form.tsx` (4 480 lines) — are so large they make isolated change and review impractical.
- Automated test coverage is near-zero: 4 unit tests for 213 route handlers, 188 models, 24 service modules, and 85 components.
- Observability is limited to `console.*` calls in 4 files; there is no structured logger and no error tracking.
- Security gaps (no CSRF tokens, no rate limiting, always-on legacy authorisation path) and data-integrity risks (non-unique `isActive` on `AcademicYear`, non-ASCII PDF stripping) are documented but unresolved.

The findings below are grounded in real files. Severity uses: **Critical** (data integrity / security / system availability risk), **High** (significant development or operational risk), **Medium** (quality / maintainability pain), **Low** (minor, cosmetic, or easily tolerable).

---

## 2. Code Quality — Structural Issues

### 2.1 Duplicate Code: the Six Near-Identical Criterion Modules

**Severity: High**

Six NAAC criterion modules — Teaching-Learning (C2), Research-Innovation (C3), Infrastructure-Library (C4), Governance-Leadership-IQAC (C6), Institutional-Values-Best-Practices (C7), and Student-Support-Governance (C5) — share an identical architecture and nearly identical code at every layer.

**Quantified duplication:**

| Module | Service Lines | Validator File | Route files (admin + faculty) | Component files |
|---|---|---|---|---|
| `teaching-learning` | 1 812 | `validators.ts` | 7 | 3 |
| `research-innovation` | 2 407 | `validators.ts` | 7 | 3 |
| `infrastructure-library` | 1 790 | `validators.ts` | 7 | 3 |
| `governance-leadership-iqac` | 1 755 | `validators.ts` | 7 | 3 |
| `institutional-values-best-practices` | 2 379 | `validators.ts` | 7 | 3 |
| `student-support-governance` | 1 790 | `validators.ts` | 7 | 3 |
| **Total** | **~11 933** | 6 | **~42** | **~18** |

Every service exposes the same nine exported functions with a module-name prefix:

```
get<Module>AdminConsole()
get<Module>ContributorWorkspace(actor)
get<Module>ReviewWorkspace(actor)
create<Module>Plan(actor, body)
update<Module>Plan(actor, id, body)
create<Module>Assignment(actor, body)
update<Module>Assignment(actor, id, body)
save<Module>ContributionDraft(actor, id, body)
submit<Module>Assignment(actor, id)
review<Module>Assignment(actor, id, body)
```

The first 80 lines of `src/lib/teaching-learning/service.ts` and `src/lib/infrastructure-library/service.ts` are structurally identical (imports for `createAuditLog`, `AuthError`, `buildAuthorizedScopeQuery`, `resolveAuthorizationProfile`, `canActorProcessWorkflowStage`, `syncWorkflowInstanceState`, and the same `Actor` / `Scope` / `HydratedDocumentRecord` type definitions).

The route handlers are pixel-identical except for the import name and message string:

```typescript
// src/app/api/teaching-learning/assignments/[id]/contribution/route.ts
// src/app/api/research-innovation/assignments/[id]/contribution/route.ts
// — these 40-line files differ only in the imported service function name
//   and the success message string.
```

**Impact:** A bug fixed in one module must be manually replicated to five others. A new capability (e.g., bulk assignment, export) costs 6× the implementation effort.

**Suggested solution:** Extract a generic `createCriterionModule(moduleConfig)` factory in `src/lib/criterion-module/` that takes a `ModuleConfig` object (model references, schema names, workflow module name, scope type) and generates the nine service functions. Expose per-module re-exports for backward compatibility (see `11_Refactoring_Strategy.md` §8.2 for sequencing).

---

### 2.2 Very Large Files

**Severity: High**

The following files are measured as monoliths that impede comprehension, review, and safe change:

| File | Lines | Problem |
|---|---|---|
| `src/components/faculty/faculty-workspace-form.tsx` | **4 480** | Single client component covering 20+ sub-collections, XLSX export, upload orchestration, and per-row field logic |
| `src/lib/research-innovation/service.ts` | **2 407** | One module covering plans, assignments, contribution drafts, sub-domain records (activities, grants, startups, publications, patents), submission, review, admin console, contributor/reviewer workspaces |
| `src/lib/institutional-values-best-practices/service.ts` | **2 379** | Same problem — single service covering 10+ domain sub-entities |
| `src/lib/pbas/service.ts` | **2 199** | 26 exported functions spanning PBAS scoring, reminders, snapshot building, admin/faculty/review queues, submission, review, approval, report data |
| `src/lib/curriculum/service.ts` | **1 975** | Curriculum plans, assignments, courses, BOS, PO/CO, calendar, syllabus, value-added |
| `src/lib/accreditation/service.ts` | **1 595** | AISHE + NIRF + compliance + SSS — four separate reporting domains in one file |

The root cause is growth without decomposition: features were added to a single `service.ts` or component file rather than being extracted into sub-modules.

**Suggested solution:**
- `pbas/service.ts` → split by concern: `pbas/application.ts`, `pbas/scoring.ts`, `pbas/review.ts`, `pbas/reminders.ts`, `pbas/report.ts` — re-export all names from a barrel `index.ts` to avoid breaking callers.
- `accreditation/service.ts` → split by regulatory domain: `aishe.ts`, `nirf.ts`, `compliance.ts`, `sss.ts`.
- `faculty-workspace-form.tsx` → decompose into section components: `<QualificationsSection>`, `<PublicationsSection>`, `<TeachingLoadSection>` etc., each independently testable.

---

### 2.3 Repeated Business Logic

**Severity: Medium**

The Actor and Scope types are defined once per criterion module rather than shared:

```typescript
// Defined verbatim in all six criterion service files:
type <Module>Actor = {
    id: string; name: string; role: string;
    department?: string; collegeName?: string; universityName?: string;
    auditContext?: AuditRequestContext;
};
type <Module>Scope = {
    departmentName?: string; collegeName?: string; universityName?: string;
    departmentId?: string; institutionId?: string; /* ... */
};
```

Similarly, the `HydratedDocumentRecord` type appears in at least four separate service files with identical or near-identical structure.

The Zod plan/assignment schema pattern (ObjectId regex, academic-year lookup, scope fields) is repeated across all six `validators.ts` files.

**Suggested solution:** Extract shared types (`CriterionActor`, `CriterionScope`, `HydratedDocumentRecord`) and shared Zod schema primitives (`objectIdSchema`, `scopeBlockSchema`) into `src/lib/criterion-module/types.ts` and `src/lib/criterion-module/validators.ts`.

---

### 2.4 Tight Coupling and Poor Separation of Concerns

**Severity: Medium**

- **Mongoose in services:** `service.ts` files import and call Mongoose models directly. There is no repository or data-access layer between the business logic and the ORM. This is a deliberate design choice (documented in `documentation.md` §3) that prioritises simplicity, but it means services cannot be unit-tested without a live Mongo connection. The four existing unit tests (`src/lib/auth/user.test.ts`, `src/lib/pbas/validators.test.ts`, `src/lib/pbas/workflow.test.ts`, `src/lib/workflow/engine.test.ts`) avoid this by testing pure functions.
- **Cross-module imports in services:** `src/lib/director/dashboard.ts` imports directly from 26 domain model files (Teaching-Learning, Research-Innovation, Infrastructure-Library, Governance-Leadership-IQAC, Institutional-Values-Best-Practices, Student-Support-Governance, CAS, PBAS, AQAR, SSR, Curriculum, Student, Faculty, Department). Any schema change in any of those 26 models forces a re-evaluation of the dashboard function.
- **`createAuditLog` coupling:** `createAuditLog` in `src/lib/audit/service.ts` (line 93) calls `AuditLog.create()` without a preceding `dbConnect()` call (the `listAuditLogs` function at line 109 does call `dbConnect()`). The audit function relies entirely on its callers having already established a connection — a fragile implicit contract.

---

### 2.5 Dead / Retired Code

**Severity: Low**

Five API route files return HTTP 410 Gone and exist solely for backward-compatibility messaging:

| File | Retired Endpoint | Message |
|---|---|---|
| `src/app/api/auth/register/route.ts` | `POST /api/auth/register` | "Public faculty registration is disabled." |
| `src/app/api/student/resume/route.ts` | `GET /api/student/resume` | "Student resume export is not part of the current flow." |
| `src/app/api/faculty/evidence/route.ts` (GET + POST) | `GET/POST /api/faculty/evidence` | "Faculty evidence workspace has been removed." |
| `src/app/api/director/student-approvals/[id]/route.ts` | `PATCH /api/director/student-approvals/[id]` | "Student approval actions are retired." |

These endpoints are well-intentioned (informative error rather than 404), but any client code that still calls them is broken. A dead-code search across the component files should confirm whether any client-side `fetch` calls still reference these paths; if not, the route files can eventually be removed.

The student PDF generation code in `src/lib/student/resume-pdf.ts` (if it exists) is similarly retired — the endpoint returns 410.

---

### 2.6 Stale / Unused Artifacts

**Severity: Low**

- **`legacy_models.txt` / `new_models.txt`** (project root): these files describe a different, older role-siloed model layout (NSS/KRC/DSD/Swayam/PM-USHA/youth-festival categories) that does not match the implemented schema under `src/models/**`. They are confirmed stale planning artifacts (`documentation.md` §8.10 note). They should be removed or moved to a `docs/archive/` folder.
- **`scripts/ts-alias-loader.mjs`**: line 23 hard-codes `/Users/rc/Projects/operant-next/src` — an absolute path to the original developer's machine. Any attempt to use this script on another machine silently fails with a file-not-found error. The fix is to resolve the path relative to `import.meta.url` at runtime.

---

### 2.7 Circular-Dependency Risk

**Severity: Low**

The large `director/dashboard.ts` imports from 26 model files; those models are also imported by their respective service files. While JavaScript/TypeScript module loading handles this gracefully at runtime (lazy evaluation), a future refactor that introduces a service-level circular dependency (e.g., `teaching-learning/service.ts` importing from `director/dashboard.ts`) could produce subtle runtime errors. There is no static circular-dependency check in the ESLint config or CI pipeline.

**Suggested solution:** Add `eslint-plugin-import` with `import/no-cycle` rule to the ESLint config.

---

### 2.8 Naming Inconsistencies

**Severity: Low–Medium**

- **Legacy `role` enum values:** `src/models/core/user.ts` line 87 defines the `role` field with the enum `['Faculty', 'Student', 'Alumni', 'Admin', 'Director', 'PRO', 'NSS', 'Sports', 'Swayam', 'Placement']`. The values `PRO`, `NSS`, `Sports`, `Swayam`, and `Placement` are legacy role types from the old model layout described in `legacy_models.txt`. In the current system, portal access is **not** determined by these `role` values — it is determined by `LeadershipAssignment` and `GovernanceCommitteeMembership`. Having these legacy values in the enum can mislead developers into thinking a user with `role: "NSS"` has any special access, when they do not.
- **Criterion module naming inconsistencies:** `governance-leadership-iqac` appears as both a folder name and a hyphenated module name but refers to Governance + Leadership + IQAC, which are three distinct NAAC concepts bundled together. This can confuse contributors adding new IQAC-only records.
- **`admin/` vs `(admin-protected)/`:** two separate directories under `src/app/` — `admin/` for login/setup and `(admin-protected)/` for the authenticated console. The relationship is not immediately obvious from the folder names alone.

---

### 2.9 Folder and Route-Group Inconsistencies

**Severity: Low**

The protected-route model uses five `(xxx-protected)` route groups, but two unprotected admin/director pages (`admin/login`, `admin/setup`, `director/login`) live in sibling `admin/` and `director/` directories that are outside the route groups. This is architecturally correct but can surprise newcomers navigating the folder tree. There is no `README` or inline comment in those directories explaining the split.

---

### 2.10 Poor / Missing Abstractions

**Severity: Medium**

- **No pagination primitive:** the `documentation.md` §21 notes "no pagination on most list endpoints." There is no shared `paginatedQuery(model, filter, page, pageSize)` helper. Every future paginated endpoint would be implemented from scratch.
- **No structured logger:** all observability is via `console.*` in 4 files (`dbConnect.ts`, `auth/email.ts`, `auth/http.ts`, `notifications/email.ts`). There is no wrapper, no log level, no correlation ID, and no structured JSON output.
- **No environment schema validator:** `documentation.md` §19 and §20 note the absence of a startup env check. Missing required variables fail lazily at first use, often deep in a request rather than at startup.
- **No shared pagination, search, or sort primitive** across the 213 route handlers. Audit logs implement their own page/pageSize/filter logic; other endpoints return unbounded sets.

---

## 3. Frontend Issues

### 3.1 Component Design and Reusability

**Severity: Medium**

The component family pattern (`-manager`, `-review-board`, `-contributor-workspace`, `-dashboard`) is consistent and well-structured. However:

- **`faculty-workspace-form.tsx` at 4 480 lines** is the largest component in the codebase. It handles 20+ sub-collections (qualifications, teaching load, publications, patents, events, FDPs, MOOCs, e-content, PhD guidance, awards, consultancy, admin roles, KPIs, AQAR contributions, etc.) in a single file. Each section is a `useFieldArray` block, making the component nearly impossible to review or test in isolation.
- The six criterion modules each have their own `-manager.tsx`, `-review-board.tsx`, and `-contributor-workspace.tsx` components that share identical tab/search/form patterns. No shared `<AssignmentTable>`, `<ReviewPanel>`, or `<ContributionForm>` primitive has been extracted.
- `src/components/admin/accreditation-operations-manager.tsx` bundles AISHE, NIRF, compliance, and SSS management into one component, mirroring the service-level bundling.

### 3.2 Hooks and State

**Severity: Low**

- All manager components use plain `useState` objects for form state (`setForm(prev => ({...prev, field}))`). This is consistent but means field-level validation must be handled manually; validation errors from the API are surfaced as banners rather than inline field errors.
- `useEffect` is used to cascade dependent selects (e.g., department → faculty list). The pattern is correct but verbose; a custom `useCascadeSelect` hook would improve readability.
- `useDeferredValue` for search and `useTransition` for mutations are used correctly in the manager components.

### 3.3 Context and Global State

**Severity: Low**

There is intentionally no React Context for application data. This is a documented design choice (`documentation.md` §14). The consequence is that session/user data is not available in Client Components — they must re-fetch it or receive it as props from server pages. For most flows this is fine; where a Client Component needs the current user (e.g., to gate a UI action), it either receives the user as a prop or makes a `/api/auth` fetch.

### 3.4 Routing

**Severity: Low**

- No parallel routes or intercepting routes are used; modal patterns are implemented with Radix `<Dialog>` state inside the same component.
- `usePathname` is used in shells for active-nav highlighting. This is correct but adds a minor re-render on every navigation.
- No `not-found.tsx` at the root level. A request to an unknown URL shows the Next.js framework default 404 page rather than a branded UMIS page.

### 3.5 Forms — Two-Paradigm Problem

**Severity: Medium**

The codebase uses two distinct form paradigms:

| Paradigm | Used in | Characteristic |
|---|---|---|
| `react-hook-form` + `zodResolver` | Auth forms, PBAS/CAS/AQAR dashboards, hierarchy manager, faculty workspace | Field registration, inline validation errors, `Controller` for complex inputs |
| Plain `useState` object | All manager CRUD forms (~20 components) | `setForm(prev => ({...prev, field}))`, manual submit, API errors as banners |

There is no documented rule for when to use which. A developer adding a new form could reasonably choose either, creating further inconsistency. The plain `useState` approach lacks built-in field-level validation, `dirty`/`touched` tracking, and `isSubmitting` state.

**Suggested solution:** Document the rule in `18_Coding_Standards.md`: use `react-hook-form` for any form with server validation requirements; use plain `useState` only for trivial single-field in-place edits.

### 3.6 UI Consistency and Accessibility

**Severity: Low–Medium**

- shadcn/ui and Radix primitives provide solid a11y foundations (ARIA roles, keyboard navigation, focus management) for all 19 UI primitives.
- The faculty layout uses a server-rendered header/footer and lacks the `<AdminShell>` / `<DirectorShell>` active-nav highlighting pattern. The active route is not visually indicated in the faculty navigation.
- Error states in manager forms surface as inline `<div className="...text-red-*">` banners; there is no `role="alert"` or `aria-live` attribute, meaning screen readers may not announce these errors automatically.
- Success/error toasts use `sonner` consistently.

### 3.7 Responsiveness

**Severity: Low**

- `<StudentShell>` implements a responsive pattern (desktop sidebar / tablet pills / mobile bottom-tab).
- Admin and director shells are primarily designed for desktop; the large admin tables with many columns do not have explicit mobile handling.
- `faculty-workspace-form.tsx` uses responsive Tailwind classes but given its complexity, mobile usability has not been systematically verified.

### 3.8 Missing Error and Loading Boundaries

**Severity: High**

| File | Count |
|---|---|
| `error.tsx` boundaries | 1 (faculty profile only) |
| `loading.tsx` skeletons | 1 (faculty profile only) |
| `not-found.tsx` pages | 0 |

An unhandled server-side error in any admin, director, or student page renders the default Next.js error UI, losing the application chrome. There are no per-module Suspense boundaries or skeleton UIs for the 25+ admin console pages.

---

## 4. Backend Issues

### 4.1 API Organisation

**Severity: Low**

The 213 route handlers are well-organised under `src/app/api/**` with a consistent path convention (`/api/admin/<module>/plans`, `/api/<module>/assignments/[id]/submit`). Minor issues:

- No API versioning (`/api/v1/`). Adding a breaking change requires all clients to update simultaneously.
- The six criterion modules each have seven identical-structure route files, contributing ~42 files that could be reduced to a dynamic route handler if the generic factory pattern is adopted.

### 4.2 Controllers / Services

**Severity: Medium**

- Route handlers are thin and consistent — authentication guard, param parse, service call, `JSON.parse(JSON.stringify(...))`, response. This is good.
- Services are fat (see §2.2). The single-file-per-module pattern has scaled past the point of maintainability for the larger modules.
- `createAuditLog` is called in ~20 services but is not wrapped in the same transaction as the write it records (`documentation.md` §23 / §27). An audit entry can be created for a write that was later rolled back, or a write can succeed without an audit entry if `createAuditLog` throws.

### 4.3 Database Access Pattern

**Severity: Medium**

- All services call `await dbConnect()` at the top of each function. This is correct but adds a small repeated cost. The `dbConnect()` function caches the connection on `globalThis`, so the actual network round-trip only happens once; subsequent calls return immediately from the guard check.
- There is no repository or data-access layer. Services interact with Mongoose models directly. This is an intentional design choice but makes unit testing impossible without a live DB.
- `.lean()` is used consistently on read queries for performance. `.populate()` is used for FK resolution — there is no risk of the N+1 pattern in the Mongoose sense (populate batches queries), but the director dashboard queries 26 collections in a single page render (see §5.5).

### 4.4 Input Validation

**Severity: Low**

- Zod schemas are defined in `validators.ts` per module and `.parse()`d inside services. This correctly surfaces `ZodError` which `createApiErrorResponse` maps to HTTP 400 with `{ message, issues[] }`.
- The same Zod schemas are reused in client-side forms via `zodResolver`, ensuring server/client validation parity.
- **Gap:** `request.json()` is called before the guard check in a small number of handlers, meaning malformed JSON can reach the parser before authentication is verified. The canonical order (guard → parse → service) is followed in most handlers but not uniformly enforced.

### 4.5 Error Handling

**Severity: High**

- API error handling is centralised and consistent (`createApiErrorResponse` in `src/lib/auth/http.ts`).
- **Client error boundaries:** only one `error.tsx` exists (faculty profile). All other portals (admin ~25 pages, director ~19 pages, student ~5 pages) have no error boundaries. An uncaught server error in a layout or page will bubble to the Next.js framework default, losing application context.
- **No `not-found.tsx`:** unknown URLs render the bare Next.js 404.
- **Failed email sends:** `src/lib/notifications/email.ts` marks a failed notification as `failed` status. There is no retry mechanism — the notification is silently lost.
- **Domain error type:** `AuthError` is used for both 4xx client errors (404/409/403) and auth errors. It carries a `.status` field but the name conflates different concerns.

### 4.6 Logging

**Severity: High**

The codebase has `console.*` calls in exactly 4 files:

| File | Usage |
|---|---|
| `src/lib/dbConnect.ts` | `console.log` on connection |
| `src/lib/auth/email.ts` | `console.info` for verification/reset links in dev |
| `src/lib/auth/http.ts` | (error mapping, no console call in measured version) |
| `src/lib/notifications/email.ts` | `console.info` for email fallback in dev |

There is no structured logger (Winston, Pino, etc.), no log levels, no correlation IDs, and no error tracking (Sentry, Datadog, etc.). In production, a failed request produces a 500 response with `"An unexpected server error occurred."` and no server-side log entry that can be correlated to the request. Diagnosing production incidents is operationally very difficult.

### 4.7 Security

**Severity: Critical / High**

Detailed in `documentation.md` §20 and `10_Technical_Debt_Report.md`. The key API-level security gaps:

- **No CSRF tokens:** `sameSite: "lax"` reduces but does not eliminate CSRF risk for state-changing POST/PATCH/DELETE endpoints.
- **No rate limiting** on login, activation, password reset, upload-intent, or email send endpoints.
- **Photo upload bypass:** `POST /api/faculty/photo` and `POST /api/student/photo` accept a URL string and only check the domain prefix — no MIME type, size, or checksum verification, unlike the finalize path.
- **`compatibilityMode = true` hard-coded** in `src/lib/authorization/service.ts` line 63 — `Organization.headUserId` always grants workflow/leadership roles with no admin toggle.
- **No security headers:** no CSP, HSTS, X-Frame-Options, or Referrer-Policy.

### 4.8 Scalability

**Severity: Medium**

- **No pagination** on most list endpoints. The six criterion module "admin console" views fetch the full authorized set of plans and assignments into memory, then pass them to the client. At low data volumes this is fine; at scale (hundreds of plans per year per module) it will cause slow responses and large JSON payloads.
- **No background job system.** Deadline reminder computation happens on every `GET /api/notifications` request. As the number of faculty grows, this becomes an increasingly expensive synchronous operation.
- **No caching layer.** Reference data (academic years, departments, programs, institutions) is read from Mongo on every request. These rarely-changing datasets are prime candidates for a short-lived in-memory or Next.js data-cache layer.
- **Synchronous PDF generation** (`src/lib/report-templates/pdf.ts`, `src/lib/pbas/report-pdf.ts`) blocks the Node.js request thread. Large cycle PDFs could exceed serverless function timeouts.

---

## 5. Database Issues

### 5.1 Schema Design

**Severity: Medium**

- 188 Mongoose models covering 10 domain categories represent genuine domain complexity, not over-engineering. The model naming and organisation is generally clear.
- **`FacultyPbasForm` and `FacultyPbasEntry` patch fields** onto an already-compiled schema (noted in `documentation.md` §8.1 as "a sign of incremental migration"). This can cause schema drift where the compiled TypeScript interface does not match the actual MongoDB documents in the collection.
- **`AcademicYear.isActive`** is a `Boolean` field with no uniqueness constraint (`documentation.md` §8.4). Multiple years can have `isActive: true` simultaneously. Services fall back to "active or latest" heuristics, meaning a stray active flag silently misroutes all new records to the wrong academic year.

### 5.2 Relationships and No Referential Integrity

**Severity: Medium**

MongoDB has no foreign-key enforcement. All ObjectId references are application-enforced. Risks:

- Deleting a `Department` does not cascade to `Faculty`, `Student`, `Program`, or any of the 17 models that carry scope-block `scopeDepartmentId`. Orphaned records would be returned by scope queries.
- Deleting a `User` does not cascade to `Faculty`, `Student`, `LeadershipAssignment`, `GovernanceCommitteeMembership`, `AuditLog`, `Notification`, etc.
- There is no soft-delete pattern on core entities; `accountStatus: "Suspended"` handles users, but there is no equivalent for Organization/Department/Faculty.

### 5.3 Constraints

**Severity: High**

| Constraint | Status | Risk |
|---|---|---|
| `AcademicYear.isActive` uniqueness | Missing | Two active years → misrouted records |
| `{planId, assigneeUserId}` unique per assignment | Present (documented §8.5) | Correct |
| `{yearStart, yearEnd}` unique per `AcademicYear` | Present | Correct |
| `email` unique per `User` | Present | Correct |
| `enrollmentNo` unique per `Student` | Present | Correct |
| `employeeCode` unique per `Faculty` | Present | Correct |

The single critical missing constraint is `AcademicYear.isActive`. A service-level guard should be added immediately; a sparse unique index on `{ isActive: 1 }` where `isActive = true` can follow after a data audit.

### 5.4 Missing or Unverified Indexes

**Severity: Medium**

The documentation notes that scope-block fields should be indexed (`documentation.md` §21). The scope block contains up to 9 fields per record:

```
scopeDepartmentName, scopeCollegeName, scopeUniversityName,
scopeDepartmentId, scopeInstitutionId,
scopeDepartmentOrganizationId, scopeCollegeOrganizationId, scopeUniversityOrganizationId,
scopeOrganizationIds: ObjectId[]
```

This block appears in at least 17 models (confirmed by grep: `scopeDepartmentName` found in 17 model files across `academic/`, `operations/`, `quality/`, `student/`, `research/`, `core/`, and `reporting/`). Whether the corresponding indexes are present in each of these models in production is not verifiable from the code alone — each model defines its own index set. A production index audit is recommended.

### 5.5 Query Optimisation and N+1 Patterns

**Severity: High**

- **Director dashboard fan-out:** `src/lib/director/dashboard.ts` imports from 26 model files. A single page render invokes 11 module × (plans count + assignment list + pending workflow IDs) = potentially 33+ sequential Mongo queries, followed by individual `Department.findById()` calls per department. There is no aggregation pipeline or `$facet` usage in the dashboard.
- **AQAR cycle snapshot and NAAC metric generation** query 20–25 collections per run (`documentation.md` §21). These are correctness-first implementations that should be converted to aggregation pipelines.
- **`Promise.all()`** is used in some places (notably the student records fetch in `director/dashboard.ts` lines 1729–1775 which parallels 10 student-record queries). This is correct and efficient for independent queries.
- **No query result caching.** Every page render re-executes all queries, even for reference data (academic years, departments, institutions) that changes infrequently.

### 5.6 Data Duplication via the Scope Block

**Severity: Medium**

The scope block (9 fields) is denormalized onto every plan and assignment record at creation time. When an Organisation is renamed, the `lib/admin/hierarchy.ts` service must re-project updated names across all scope-block fields in all affected records. If the re-projection fails or is interrupted, scope queries will return stale department/college names in the UI.

The scope block is a conscious architectural decision (documented in `documentation.md` §8.3) that trades data duplication for join-free scoped queries. The trade-off is appropriate for the use case but requires the re-projection code path to be reliable and transactional.

### 5.7 Normalisation Trade-Off

**Severity: Low**

The `User` model embeds `experience[]` and `researchProfile` as subdocuments. The `Faculty` model has its own sub-collections for professional records. There is some duplication between `User.researchProfile` and `Faculty.*` records; the exact boundary is not documented in the schema.

### 5.8 Performance

**Severity: Medium**

- **Unpaginated lists:** the 6 criterion module admin consoles, the governance committee views, the SSR metric list, and the audit-log drilldown (except audit logs which supports pagination) all return full authorized sets.
- **`JSON.parse(JSON.stringify(data))`** is applied to Mongoose documents before passing them to Client Components. This is necessary to strip non-serializable types but is O(n) on the document size. For large faculty workspace data or full PBAS snapshots, this serialization happens on the request thread.
- **No `next/dynamic` for heavy client libraries.** React Flow (`@xyflow/react`) and `xlsx` are statically imported. They increase the initial bundle for every admin user even if they never visit the hierarchy manager or the provisioning panels.

---

## 6. Prioritised Summary Table

| # | Area | Finding | Severity | File(s) |
|---|---|---|---|---|
| 1 | Security | No CSRF tokens on state-changing endpoints | Critical | `src/lib/auth/config.ts`, all mutation routes |
| 2 | Security | No rate limiting on auth/upload/email | Critical | `src/app/api/auth/*`, `/api/documents` |
| 3 | Database | `AcademicYear.isActive` not uniqueness-constrained | Critical | `src/models/reference/academic-year.ts` |
| 4 | Backend | No error boundaries except faculty profile | High | All `(admin/director/student-protected)` pages |
| 5 | Security | Photo upload endpoints bypass MIME/size verification | High | `src/app/api/faculty/photo/route.ts`, `src/app/api/student/photo/route.ts` |
| 6 | Backend | `console`-only logging, no error tracking | High | `src/lib/dbConnect.ts`, `src/lib/auth/email.ts`, etc. |
| 7 | Backend | `createAuditLog` not transaction-bound | High | `src/lib/audit/service.ts` |
| 8 | Database | Director dashboard: 26+ model fan-out per render | High | `src/lib/director/dashboard.ts` |
| 9 | Code Quality | 6 criterion modules duplicate ~11 933 lines of code | High | `src/lib/{teaching-learning,...}/service.ts` (×6) |
| 10 | Code Quality | Very large files: `faculty-workspace-form.tsx` (4 480 lines) | High | `src/components/faculty/faculty-workspace-form.tsx` |
| 11 | Code Quality | `research-innovation/service.ts` (2 407 lines), `pbas/service.ts` (2 199 lines) | High | `src/lib/research-innovation/service.ts`, `src/lib/pbas/service.ts` |
| 12 | Backend | Near-zero test coverage: 4 unit tests for 213 routes + 188 models | High | `src/lib/auth/user.test.ts`, `src/lib/pbas/workflow.test.ts`, `src/lib/workflow/engine.test.ts`, `src/lib/pbas/validators.test.ts` |
| 13 | Backend | No environment-schema validation at startup | High | `src/lib/auth/config.ts`, missing `src/lib/env.ts` |
| 14 | Database | No pagination on most list endpoints | Medium | All `get*AdminConsole()` functions in criterion services |
| 15 | Security | `compatibilityMode = true` hard-coded in authorization | Medium | `src/lib/authorization/service.ts` line 63 |
| 16 | Code Quality | Two form paradigms coexist without documented rule | Medium | All `*-manager.tsx` components |
| 17 | Code Quality | Repeated `Actor`/`Scope`/`HydratedDocumentRecord` types across 6 modules | Medium | `src/lib/{criterion modules}/service.ts` |
| 18 | Database | Scope-block denormalization: re-projection reliability unverified | Medium | `src/lib/admin/hierarchy.ts`, 17 model files |
| 19 | Code Quality | Stale `legacy_models.txt`/`new_models.txt` artifacts | Low | Project root |
| 20 | Code Quality | `ts-alias-loader.mjs` hard-codes `/Users/rc/Projects/...` path | Low | `scripts/ts-alias-loader.mjs` line 23 |
| 21 | Code Quality | Legacy role enum values (`PRO`, `NSS`, `Sports`, `Swayam`, `Placement`) mislead | Low | `src/models/core/user.ts` line 87 |
| 22 | Frontend | No `not-found.tsx` page | Low | `src/app/` |
| 23 | Backend | No API versioning strategy | Low | All `src/app/api/**` routes |
| 24 | Backend | No dynamic import for React Flow / xlsx | Medium | `src/components/admin/hierarchy-manager.tsx`, 5 xlsx-using components |
| 25 | Database | PDF generator strips non-ASCII, corrupting Indian-language names | Critical | `src/lib/report-templates/pdf.ts` |

> Severity key: **Critical** = data integrity or security risk · **High** = significant operational/development risk · **Medium** = quality/maintainability pain · **Low** = cosmetic or low-impact

---

*This report reflects the codebase as of the commit on the `main` branch at the time of review. When code and this document disagree, treat the code as the source of truth and update this file. For remediation sequencing, see [10_Technical_Debt_Report.md](10_Technical_Debt_Report.md) and [11_Refactoring_Strategy.md](11_Refactoring_Strategy.md).*
