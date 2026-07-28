# 18 — Coding Standards

> **Project:** operant-next (UMIS)
> **Status:** Mandatory for all new code. Existing code should be migrated opportunistically during feature work.
> **Related docs:** [README.md](../README.md) · [02_Current_Architecture.md](02_Current_Architecture.md) · [07_Frontend_Architecture.md](07_Frontend_Architecture.md) · [06_API_Documentation.md](06_API_Documentation.md) · [09_Code_Quality_Report.md](09_Code_Quality_Report.md) · [10_Technical_Debt_Report.md](10_Technical_Debt_Report.md) · [11_Refactoring_Strategy.md](11_Refactoring_Strategy.md) · [14_Testing_Strategy.md](14_Testing_Strategy.md)

These standards are derived from the real patterns found in `src/` and the problems identified during codebase review. Each rule cites the file where the pattern originates.

---

## Table of Contents

1. [Folder & File Conventions](#1-folder--file-conventions)
2. [Naming Conventions](#2-naming-conventions)
3. [Component Rules](#3-component-rules)
4. [Custom Hooks](#4-custom-hooks)
5. [Services — The `lib/<domain>/service.ts` Contract](#5-services--the-libdomainservicets-contract)
6. [API Route Conventions](#6-api-route-conventions)
7. [Database & Model Rules](#7-database--model-rules)
8. [Validation — Zod Schema Placement](#8-validation--zod-schema-placement)
9. [Logging Standard](#9-logging-standard)
10. [Error Handling](#10-error-handling)
11. [Testing Conventions](#11-testing-conventions)
12. [Comments & JSDoc](#12-comments--jsdoc)
13. [Current Inconsistencies to Eliminate](#13-current-inconsistencies-to-eliminate)
14. [PR Checklist](#14-pr-checklist)

---

## 1. Folder & File Conventions

### App router (`src/app/`)

```
src/app/
├── layout.tsx                         Root layout — global providers only
├── page.tsx                           Landing page
├── globals.css                        Tailwind v4 + design tokens
├── (auth)/                            Route group — no guard, public pages
├── (admin-protected)/admin/           Route group + layout guard → AdminShell
├── (director-protected)/director/     Route group + layout guard → DirectorShell
├── (faculty-protected)/faculty/       Route group + layout guard → inline server header
├── (student-protected)/student/       Route group + layout guard → StudentShell
└── api/                               213 route handlers — one route.ts per resource action
```

Rules:
- Route groups `(name)` add auth boundaries **without adding URL segments**.
- New guarded pages MUST live inside the correct `(…-protected)` group. The group layout calls the guard; the page itself does not need to repeat it.
- A new public page goes in `(auth)/` or at the root. Never add a page outside a group that needs auth.
- Add a `loading.tsx` (skeleton) and `error.tsx` (client boundary) alongside every new page or at the group layout level.
- API routes live under `src/app/api/`. One file (`route.ts`) per resource; one sub-directory per action segment (`/submit`, `/review`, `/[id]`).

### Library modules (`src/lib/`)

```
src/lib/
├── auth/          session, config, tokens, password, user guards, email, http, errors, validators
├── authorization/ service.ts — governance RBAC
├── workflow/      engine.ts — generic state-machine
├── audit/         service.ts + request.ts
├── notifications/ service.ts + email.ts
├── upload/        service.ts + policy.ts
├── firebase/      config.ts
├── dbConnect.ts
└── <domain>/      service.ts  validators.ts  (+ report-pdf, catalog, etc.)
```

Rules:
- Every business feature gets its own `src/lib/<domain>/` folder.
- The folder MUST contain `service.ts` (business logic + Mongoose access) and `validators.ts` (Zod schemas).
- Domain-specific sub-concerns (PDF generation, catalog seeding, report defaults) get their own file inside the folder: `report-pdf.ts`, `catalog.ts`, `migration.ts`.
- Cross-cutting infrastructure (`auth`, `workflow`, `audit`, `notifications`, `upload`) lives in its own top-level lib folder and is imported by feature services — never duplicated.

### Models (`src/models/`)

```
src/models/
├── core/         41 files — user, org, PBAS, CAS, AQAR, workflow, governance, audit, notification…
├── reporting/    35 files — AISHE, NIRF, NAAC metrics, SSR…
├── faculty/      22 files
├── academic/     20 files
├── student/      19 files
├── quality/      16 files
├── reference/    12 files
├── research/     9 files
├── engagement/   8 files
└── operations/   6 files
```

Rules:
- A new model goes in the most appropriate domain category. When in doubt, prefer `core/` for cross-cutting entities and a feature-specific category for domain records.
- One model per file. File name = kebab-case version of the model name (`faculty-pbas-form.ts`, not `FacultyPbasForm.ts`).
- Never create a new category folder without documenting it here.

### Components (`src/components/`)

```
src/components/
├── ui/                    shadcn/Radix primitives — DO NOT hand-edit unless upgrading shadcn
├── shared/                (to be created) — reusable cross-feature components
├── auth/                  login, activation, password helpers
├── notifications/         notification-center
├── admin/                 admin-shell + admin-only managers
├── director/              director-shell + director-only components
├── student/               student-shell + student-specific forms
├── faculty/               faculty-workspace-form + faculty-specific helpers
└── <feature>/             per-module family: *-manager, *-review-board,
                           *-contributor-workspace, *-dashboard
```

Rules:
- Place a new component in the folder that matches its consuming portal or the feature it belongs to.
- Shared cross-feature components go in `components/shared/` (not inline in a feature component).
- The `components/ui/` folder is generated by shadcn — edit through `npx shadcn` commands, not manually.

---

## 2. Naming Conventions

### Files

| Item | Convention | Examples |
|---|---|---|
| All source files | `kebab-case.ts(x)` | `teaching-learning-manager.tsx`, `faculty-pbas-form.ts` |
| App Router segments | `kebab-case` (Next.js enforced) | `academic-year/`, `naac-metric-warehouse/` |
| Route handlers | Always `route.ts` | `src/app/api/admin/users/route.ts` |
| Special Next.js files | Framework names | `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` |
| Vitest test files | `*.test.ts` | `workflow-engine.test.ts` |

### TypeScript / React

| Item | Convention | Examples |
|---|---|---|
| React components | `PascalCase` | `TeachingLearningManager`, `AdminShell` |
| Mongoose model interfaces | `I` prefix + `PascalCase` | `IUser`, `ITeachingLearningPlan` |
| Type aliases (non-interface) | `PascalCase` | `TeachingLearningActor`, `SafeUser` |
| Hooks | `use` prefix + `camelCase` | `useTransition`, `useMutation` |
| Service functions | `camelCase` verb-noun | `createTeachingLearningPlan`, `getAdminConsole` |
| Validator schemas | `camelCase` domain + `Schema` suffix | `teachingLearningPlanSchema`, `loginSchema` |
| Constants / enum arrays | `camelCase` plural + `Values` suffix | `teachingLearningWorkflowStatusValues` |
| Local helper functions | `camelCase` | `formatDate`, `requestJson`, `toSafeUser` |

### Mongoose models & collections

| Item | Convention | Examples |
|---|---|---|
| Model registration name | `PascalCase` (singular) | `"User"`, `"TeachingLearningPlan"` |
| MongoDB collection name | `snake_case` (plural) | `collection: 'users'`, `collection: 'teaching_learning_plans'` |
| Ref strings | Match model registration name exactly | `ref: "User"`, `ref: "Department"` |

```ts
// DO
const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
// Schema: { collection: 'users' }

// DON'T — inconsistent casing or plural model name
const userModel = mongoose.model<IUser>("users", UserSchema);
```

### Zod schemas

```ts
// DO — domain prefix + Schema suffix, exported from validators.ts
export const teachingLearningPlanSchema = z.object({ … });
export const teachingLearningPlanUpdateSchema = teachingLearningPlanSchema.partial();

// DON'T — generic names that clash across modules
export const planSchema = z.object({ … });
export const schema = z.object({ … });
```

---

## 3. Component Rules

### Server-by-default

A component is a Server Component unless it requires browser-only APIs, React hooks, or event handlers.

```ts
// DO — default: no directive, async, calls a service
// src/app/(admin-protected)/admin/teaching-learning/page.tsx
import { getTeachingLearningAdminConsole } from "@/lib/teaching-learning/service";
import { TeachingLearningManager } from "@/components/teaching-learning/teaching-learning-manager";

export default async function TeachingLearningPage() {
    const data = await getTeachingLearningAdminConsole(actor);
    return <TeachingLearningManager {...JSON.parse(JSON.stringify(data))} />;
}

// DON'T — add "use client" to a page just to avoid async data fetching
"use client";
export default function TeachingLearningPage() {
    const [data, setData] = useState(null);
    useEffect(() => { fetch(…).then(setData); }, []);  // ← client waterfall
```

### `"use client"` — when required

Add `"use client"` at the top of a file **only** when the component:
- Uses React hooks (`useState`, `useEffect`, `useTransition`, `usePathname`, `useRouter`, `useForm`, etc.)
- Attaches event handlers (`onClick`, `onSubmit`, `onChange`)
- Uses a browser-only API (`window`, `document`, `localStorage`)
- Wraps a Radix headless component that requires interactivity

```ts
// DO — minimal "use client" leaf
"use client";
import { useState } from "react";

export function TeachingLearningManager(props: Props) {
    const [tab, setTab] = useState("plans");
    …
}

// DON'T — "use client" on the page itself when only the leaf needs it
"use client";
export default function TeachingLearningPage() { … }
```

### Component family suffixes

All feature components MUST follow the established family naming:

| Suffix | Purpose |
|---|---|
| `*-manager.tsx` | Admin create/edit/delete (plans, assignments, catalogs) |
| `*-review-board.tsx` | Read + workflow decision UI (approve/reject/forward) |
| `*-contributor-workspace.tsx` | Faculty draft + evidence upload + submit |
| `*-dashboard.tsx` | Faculty personal application + history view |

Naming deviations (e.g. `*-panel.tsx`, `*-console.tsx`) are acceptable only for components that genuinely do not fit any of the four roles above.

### Props: serialized data from Server pages

Client components receive plain JS objects (not Mongoose documents). Server pages must serialize before passing:

```ts
// DO — strip Mongoose types at the Server→Client boundary
const raw = await getTeachingLearningAdminConsole(actor);
return <TeachingLearningManager data={JSON.parse(JSON.stringify(raw))} />;

// DON'T — pass a Mongoose Document directly (non-serializable ObjectId/Date)
return <TeachingLearningManager data={raw} />;
```

### No prop-drilling past two levels

If a prop needs to travel more than two component levels, introduce a context or restructure so the consumer fetches its own data via an API call.

### `cn()` for class composition

Always use `cn()` from `@/lib/utils` for conditional Tailwind class composition. Do not use template literals or string concatenation for class names.

```ts
// DO
<div className={cn("rounded-xl border p-4", isActive && "border-sky-200 bg-sky-50")}>

// DON'T
<div className={`rounded-xl border p-4 ${isActive ? "border-sky-200 bg-sky-50" : ""}`}>
```

---

## 4. Custom Hooks

Rules:
- Extract reusable stateful logic into `src/hooks/<name>.ts`.
- All custom hooks start with `use`.
- A hook may not import from `src/models/` — hooks are client-side; model access belongs in services.
- A hook should have a single, clearly named responsibility.

```ts
// src/hooks/use-mutation.ts (proposed standard)
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function useMutation<TInput>(
    url: string,
    method: "POST" | "PATCH" | "PUT" | "DELETE" = "POST"
) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    async function mutate(body: TInput) {
        setError(null);
        startTransition(async () => {
            try {
                const res = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message ?? "Request failed.");
                router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Request failed.");
            }
        });
    }

    return { mutate, isPending, error };
}
```

---

## 5. Services — The `lib/<domain>/service.ts` Contract

Every service function follows this pipeline:

```
dbConnect() → Zod parse → scope/auth check → Mongoose operation → audit log → notify → return entity
```

### Canonical service function shape

```ts
// src/lib/teaching-learning/service.ts — abridged canonical example
import dbConnect from "@/lib/dbConnect";
import { createAuditLog, type AuditRequestContext } from "@/lib/audit/service";
import { AuthError } from "@/lib/auth/errors";
import { teachingLearningPlanSchema } from "@/lib/teaching-learning/validators";
import TeachingLearningPlan from "@/models/academic/teaching-learning-plan";

type Actor = {
    id: string;
    name: string;
    role: string;
    department?: string;
    auditContext?: AuditRequestContext;
};

export async function createTeachingLearningPlan(actor: Actor, input: unknown) {
    // 1. Connect to DB — ALWAYS first
    await dbConnect();

    // 2. Zod parse — inside the service, NOT in the route handler
    const data = teachingLearningPlanSchema.parse(input);

    // 3. Business / scope rules
    const year = await AcademicYear.findById(data.academicYearId);
    if (!year) throw new AuthError("Academic year not found.", 404);

    // 4. Mongoose write
    const plan = await TeachingLearningPlan.create({ …data });

    // 5. Audit log
    await createAuditLog({
        actor: { id: actor.id, name: actor.name, role: actor.role },
        action: "CREATE",
        tableName: "teaching_learning_plans",
        recordId: plan._id.toString(),
        newData: plan.toObject(),
        auditContext: actor.auditContext,
    });

    // 6. Return entity (NOT the raw Mongoose doc — caller will serialize)
    return plan;
}
```

### Rules

- `dbConnect()` is the **first line** of every service function. No exceptions. (See [§13](#13-current-inconsistencies-to-eliminate) — `createAuditLog` currently lacks this.)
- Zod `.parse()` (not `.safeParse()`) is called **inside the service**. This lets the error propagate through the route's `catch → createApiErrorResponse` and return a 400.
- Business errors use `throw new AuthError(message, statusCode)`. Status codes: 404 not found, 409 conflict, 403 forbidden, 410 gone.
- Scope queries for non-Admin actors use `buildAuthorizedScopeQuery(profile)` from `src/lib/authorization/service.ts`.
- Every write that changes meaningful state MUST call `createAuditLog`. Read-only queries do not need audit.
- Notifications (`notifyWorkflowStageAssignees`, `createNotification`) are sent inside the service, after the DB write succeeds.
- Service functions return the Mongoose document (or a lean/transformed version). The **route handler** applies `JSON.parse(JSON.stringify(...))`.

---

## 6. API Route Conventions

### Canonical route handler shape

```ts
// src/app/api/admin/teaching-learning/plans/route.ts — canonical example
import { NextResponse } from "next/server";
import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createTeachingLearningPlan } from "@/lib/teaching-learning/service";

export async function POST(request: Request) {
    try {
        // 1. Auth guard — FIRST
        const admin = await assertAdminApiAccess();

        // 2. Parse request
        const body = await request.json();

        // 3. Delegate to service (NO business logic in the route)
        const plan = await createTeachingLearningPlan(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
                department: admin.department,
                collegeName: admin.collegeName,
                universityName: admin.universityName,
                auditContext: getRequestAuditContext(request),
            },
            body
        );

        // 4. Return success envelope
        return NextResponse.json({
            message: "Teaching learning plan created successfully.",
            plan: JSON.parse(JSON.stringify(plan)),
        });
    } catch (error) {
        // 5. Centralized error mapping — NEVER throw from a route
        return createApiErrorResponse(error);
    }
}
```

### Rules

| # | Rule | Rationale |
|---|---|---|
| 1 | Auth guard is **the first statement** inside `try {}` | Prevents unauthenticated parsing/processing |
| 2 | Dynamic params: `const { id } = await context.params;` | Next.js 15/16 — params is a Promise |
| 3 | No Zod parsing in the route — delegate to the service | Keeps routes thin; one error path |
| 4 | No Mongoose access in the route — delegate to the service | Enforces layering |
| 5 | Success response: `{ message, <entityName> }` for mutations; `{ <entities> }` for reads | Consistent client contract |
| 6 | Always `catch (error) { return createApiErrorResponse(error); }` | One error mapper for all error types |
| 7 | Serialize the response: `JSON.parse(JSON.stringify(entity))` | Strips ObjectId / Date |
| 8 | Partial-success (bulk): return HTTP 207 with `{ created[], failed[] }` | Client can show per-row errors |

### Auth guards by context

| Context | Guard to use |
|---|---|
| Admin API routes (`/api/admin/**`) | `assertAdminApiAccess()` |
| Director/leadership routes | `assertLeadershipApiAccess()` |
| Faculty/student routes | `getCurrentUser()` + inline role check |
| Workflow review/approve endpoints | `canActorProcessWorkflowStage(profile, module, stage)` |
| Bootstrap | `x-admin-bootstrap-secret` header + `timingSafeEqual` |

```ts
// DO — use the right guard for the context
const admin = await assertAdminApiAccess();     // throws AuthError(403) if not admin

// DON'T — inline role check in an admin route (inconsistent, easy to forget)
const user = await getCurrentUser();
if (user.role !== "Admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
```

---

## 7. Database & Model Rules

### Canonical model shape

Every Mongoose model MUST follow this pattern (grounded in `src/models/core/user.ts`):

```ts
// src/models/<category>/<model-name>.ts
import mongoose, { Document, Model, Schema } from "mongoose";

// 1. TypeScript interface
export interface IMyModel extends Document {
    fieldA: string;
    fieldB?: string;
    refId?: mongoose.Types.ObjectId;
    status: "Draft" | "Submitted" | "Approved";
    createdAt: Date;
    updatedAt: Date;
}

// 2. Shared enum array — reused by Zod validators
export const myModelStatusValues = ["Draft", "Submitted", "Approved"] as const;

// 3. Schema — with { timestamps: true } and explicit collection name
const MyModelSchema = new Schema<IMyModel>(
    {
        fieldA: { type: String, required: true, trim: true, index: true },
        fieldB: { type: String, trim: true },
        refId: { type: Schema.Types.ObjectId, ref: "TargetModel", index: true },
        status: {
            type: String,
            required: true,
            enum: myModelStatusValues,
            default: "Draft",
            index: true,
        },
    },
    { timestamps: true, collection: "my_models" }  // snake_case collection name
);

// 4. Compound indexes — after schema declaration
MyModelSchema.index({ refId: 1, status: 1 });
MyModelSchema.index({ fieldA: 1, fieldB: 1 }, { unique: true });

// 5. Hot-reload-safe registration guard — MANDATORY
const MyModel: Model<IMyModel> =
    mongoose.models.MyModel || mongoose.model<IMyModel>("MyModel", MyModelSchema);

export default MyModel;
```

### Rules

| Rule | Code reference |
|---|---|
| `{ timestamps: true }` on every schema | All 188 models |
| `{ _id: false }` on embedded sub-document schemas | `src/models/core/user.ts` — `ExperienceSchema`, `ResearchProfileSchema` |
| Enum values defined as `as const` array and imported by Zod | `src/models/academic/teaching-learning-plan.ts` → `src/lib/teaching-learning/validators.ts` |
| `password`, token hashes: `select: false` | `src/models/core/user.ts` |
| Sparse unique index for optional FK | `UserSchema.index({ studentId: 1 }, { unique: true, sparse: true })` |
| Hot-reload registration guard | `mongoose.models.X \|\| mongoose.model(…)` |
| Scope block fields indexed | All plan/assignment models |
| `{ collection: 'snake_case_plural' }` always explicit | All models |

### Scope block (required for all plan/assignment/reporting records)

Any record that participates in scoped authorization MUST include the scope block fields. Copy from an existing assignment model (e.g. `src/models/academic/teaching-learning-assignment.ts`):

```ts
// Scope block — copy verbatim to any record that needs scoped authorization
scopeDepartmentName:         { type: String },
scopeCollegeName:            { type: String },
scopeUniversityName:         { type: String },
scopeDepartmentId:           { type: Schema.Types.ObjectId },
scopeInstitutionId:          { type: Schema.Types.ObjectId },
scopeDepartmentOrganizationId: { type: Schema.Types.ObjectId },
scopeCollegeOrganizationId:  { type: Schema.Types.ObjectId },
scopeUniversityOrganizationId: { type: Schema.Types.ObjectId },
scopeOrganizationIds:        [{ type: Schema.Types.ObjectId }],
```

---

## 8. Validation — Zod Schema Placement

### Where schemas live

```
src/lib/<domain>/validators.ts    ← ALL Zod schemas for that domain
src/lib/auth/validators.ts        ← Auth schemas (login, activation, password, register)
```

There are no inline `z.object({…})` declarations inside route handlers or service functions. All schemas are defined in the domain's `validators.ts` and imported.

### Schema naming and structure

```ts
// DO — paired create/update schemas; enums imported from models
import { teachingLearningPlanStatusValues } from "@/models/academic/teaching-learning-plan";

export const teachingLearningPlanSchema = z.object({
    academicYearId: objectIdSchema,           // reusable local const
    status: z.enum(teachingLearningPlanStatusValues).default("Draft"),
    title: z.string().trim().min(3, "Plan title is required."),
});

export const teachingLearningPlanUpdateSchema = teachingLearningPlanSchema.partial();

// DON'T — inline schema in the service function
export async function createPlan(actor, input) {
    const data = z.object({ title: z.string() }).parse(input);  // ← wrong
```

### Reusable schema helpers

Define these once at the top of `validators.ts` (every domain's `validators.ts` currently does this):

```ts
const objectIdSchema = z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{24}$/, "Invalid identifier.");

const optionalObjectIdSchema = z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[a-fA-F0-9]{24}$/.test(v), "Invalid identifier.");
```

### Client-side form schemas

For client forms using react-hook-form, use the **same Zod schema** as the API:

```ts
// DO — single source of truth; z.infer derives the TypeScript type
import { teachingLearningPlanSchema } from "@/lib/teaching-learning/validators";
type PlanFormValues = z.infer<typeof teachingLearningPlanSchema>;

const form = useForm<PlanFormValues>({ resolver: zodResolver(teachingLearningPlanSchema) });

// DON'T — define a separate PlanFormState type and maintain it in sync
type PlanFormState = { title: string; academicYearId: string; … };  // ← diverges
```

---

## 9. Logging Standard

### Current state (problem)

The entire codebase uses `console.log` / `console.error` / `console.info` only:

```ts
// src/lib/dbConnect.ts — only meaningful existing log
console.log("Connecting to MongoDB with URI:", mongoUri?.split("@")[1] || "UNDEFINED");

// src/lib/auth/http.ts — unstructured error log
console.error(error);
```

There is no structured logger, no log levels, no request correlation IDs, and no error-tracking integration. This is documented as a gap in [10_Technical_Debt_Report.md](10_Technical_Debt_Report.md).

### Immediate standard (no new tooling required)

Until a structured logger is introduced, apply these rules:

| Situation | What to log | Level |
|---|---|---|
| Unhandled server error in `createApiErrorResponse` | `console.error("[API Error]", error)` | error |
| DB connection established | `console.info("[DB] Connected:", host)` | info |
| Email sent / fallback | `console.info("[Email] Sent to:", email)` or `console.info("[Email] No API key, logging link")` | info |
| Business warning (e.g. stale data) | `console.warn("[Service] …")` | warn |
| Debug / trace | Not in production code | — |
| Sensitive data (tokens, passwords, PII) | **Never log** | — |

### Recommended structured logger (Phase 1 improvement)

Introduce `pino` (or a similar structured logger) behind an abstraction in `src/lib/logger.ts`:

```ts
// src/lib/logger.ts (proposed)
import pino from "pino";

export const logger = pino({
    level: process.env.LOG_LEVEL ?? "info",
    ...(process.env.NODE_ENV === "development" ? { transport: { target: "pino-pretty" } } : {}),
});
```

Replace `console.error(error)` in `createApiErrorResponse` with `logger.error({ err: error }, "API error")`.

---

## 10. Error Handling

### Domain errors

All business-logic errors thrown from services use `AuthError` from `src/lib/auth/errors.ts`:

```ts
// src/lib/auth/errors.ts
export class AuthError extends Error {
    status: number;
    constructor(message: string, status = 400) {
        super(message);
        this.name = "AuthError";
        this.status = status;
    }
}
```

HTTP status conventions:

| Status | When to throw |
|---|---|
| 400 | Invalid input (Zod will throw this automatically) |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate, state constraint violation) |
| 410 | Gone / retired endpoint |

```ts
// DO — specific status codes
throw new AuthError("Teaching learning plan not found.", 404);
throw new AuthError("Only the assignee may submit this contribution.", 403);
throw new AuthError("A form for this faculty and year already exists.", 409);

// DON'T — generic 400 for not-found
throw new AuthError("Not found.");  // wrong status
throw new Error("Not found.");      // not caught by createApiErrorResponse as AuthError
```

### API error mapper

All route handlers funnel to `createApiErrorResponse` from `src/lib/auth/http.ts`:

```ts
// src/lib/auth/http.ts (existing)
export function createApiErrorResponse(error: unknown) {
    if (error instanceof ZodError)       → 400 { message, issues[] }
    if (isMongooseValidationError)       → 400 { message, issues[] }
    if (isMongooseCastError)             → 400 { message, issues[] }
    if (error instanceof AuthError)      → error.status { message }
    else                                 → 500 { message: "…unexpected server error." }
}
```

**Never** return a raw `NextResponse.json({ message: "…" }, { status: 500 })` from a route handler. Always re-throw and let `createApiErrorResponse` handle it.

### Client error handling

```ts
// DO — surface server message; fall back to generic
try {
    await requestJson(url, options);
    setError(null);
} catch (err) {
    setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
}

// DON'T — swallow errors silently
try { await requestJson(…); } catch { /* silent */ }
```

### Error boundaries

Every new page group MUST have an `error.tsx` Client component:

```tsx
// src/app/(admin-protected)/admin/error.tsx (proposed)
"use client";
import { useEffect } from "react";

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // TODO: replace with logger.error when logger is introduced
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
            <h2 className="text-lg font-semibold">Something went wrong.</h2>
            <p className="text-sm text-zinc-500">{error.message}</p>
            <button onClick={reset}>Try again</button>
        </div>
    );
}
```

---

## 11. Testing Conventions

Current state: 4 unit tests (Vitest, `*.test.ts`). See [14_Testing_Strategy.md](14_Testing_Strategy.md) for the full testing roadmap.

### File placement

```
src/lib/workflow/engine.test.ts    ← co-located with the module under test
src/lib/pbas/service.test.ts       ← service unit tests
```

### What to test

| Priority | Target | Type |
|---|---|---|
| P0 | `src/lib/workflow/engine.ts` — `resolveWorkflowTransition`, `canActorProcessWorkflowStage` | Unit |
| P0 | `src/lib/authorization/service.ts` — `resolveAuthorizationProfile` | Unit |
| P0 | Submit/review gate logic per module service | Unit |
| P1 | API route handlers — happy path + auth rejection + Zod rejection | Integration (MSW or test DB) |
| P2 | Client components — form submit, error display, loading state | Component (Vitest + Testing Library) |

### Test naming

```ts
// DO — descriptive: describes the scenario, not the implementation
describe("resolveWorkflowTransition", () => {
    it("returns the next status when action is valid for current status", () => { … });
    it("throws when action is not defined for the current stage", () => { … });
});

// DON'T — implementation-focused
it("calls db and returns plan", () => { … });
```

### Mock conventions

- Services under test: mock Mongoose models using `vi.mock("@/models/…")`.
- Never mock `dbConnect` globally — test files that call services must mock the models they use.
- Integration tests against a real DB: use a dedicated test DB (separate `MONGODB_URI_TEST`).

---

## 12. Comments & JSDoc

### JSDoc: required for public service functions and complex utilities

```ts
/**
 * Creates a new Teaching Learning plan and writes an audit log entry.
 *
 * @param actor - The admin user performing the action. Provides scope and audit context.
 * @param input - Raw (unvalidated) request body. Parsed internally with Zod.
 * @returns The created `TeachingLearningPlan` Mongoose document.
 * @throws {AuthError} 404 if the referenced academic year or program does not exist.
 * @throws {ZodError} 400 if `input` fails schema validation.
 */
export async function createTeachingLearningPlan(
    actor: TeachingLearningActor,
    input: unknown
): Promise<ITeachingLearningPlan> { … }
```

JSDoc is required for:
- All exported functions in `src/lib/**` services
- All custom hooks
- Non-obvious type aliases

JSDoc is not required for:
- React component function signatures (props types are self-documenting)
- Simple getter/setter helpers
- Internal helpers in route handlers

### Inline comments — use sparingly

```ts
// DO — explain non-obvious business rule
// Submission is blocked unless the total claimed score is greater than zero.
if (form.totalScore <= 0) throw new AuthError("PBAS score must be greater than zero before submission.", 400);

// DO — explain intentional workaround
// JSON.parse(JSON.stringify(...)) strips ObjectId and Date, which cannot cross the RSC boundary.
return <Manager data={JSON.parse(JSON.stringify(raw))} />;

// DON'T — comment that restates the code
// set the status to "Submitted"
assignment.status = "Submitted";
```

### No dead code or commented-out code

Remove commented-out code blocks before merging. Use git history for recovery. Retired endpoints return HTTP 410 Gone — they are documented in [06_API_Documentation.md](06_API_Documentation.md), not left as commented code.

---

## 13. Current Inconsistencies to Eliminate

The following patterns exist in the codebase and must NOT be replicated in new code. They should be fixed opportunistically during feature work or as part of the refactoring work documented in [11_Refactoring_Strategy.md](11_Refactoring_Strategy.md).

### I1 — Inline auth checks in API routes vs guard helpers

Some faculty/student routes perform inline `getCurrentUser()` + role check, while admin routes uniformly call `assertAdminApiAccess()`.

```ts
// BAD — inline pattern (found in some faculty/student routes)
const user = await getCurrentUser();
if (!user) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
if (user.role !== "Faculty") return NextResponse.json({ message: "Forbidden." }, { status: 403 });

// GOOD — use the shared guard or a new helper
const user = await requireFacultyApiAccess();  // create this helper if it doesn't exist
```

Create `requireFacultyApiAccess()` and `requireStudentApiAccess()` in `src/lib/auth/user.ts` mirroring `assertAdminApiAccess()`.

### I2 — Two form paradigms (plain `useState` vs react-hook-form)

See [07_Frontend_Architecture.md §9](07_Frontend_Architecture.md#9-forms--two-paradigms). All new forms MUST use Paradigm A (rhf + zodResolver). Manager CRUD forms should be migrated progressively.

### I3 — `requestJson<T>` duplicated in every manager component

Each manager defines its own copy of the fetch wrapper. Replace with a single export from `src/lib/api-client.ts` (to be created) as described in [07_Frontend_Architecture.md §14 R3](07_Frontend_Architecture.md#14-recommended-solutions).

### I4 — `role` enum legacy values

The `UserRole` type in `src/models/core/user.ts` includes legacy values (`PRO`, `NSS`, `Sports`, `Swayam`, `Placement`, `Director`) that are not the real access-control mechanism. The `Director` portal role is earned via `LeadershipAssignment`, not the `role` field.

```ts
// src/models/core/user.ts — current (misleading)
export type UserRole =
    | "Faculty" | "Student" | "Alumni" | "Admin" | "Director"
    | "PRO" | "NSS" | "Sports" | "Swayam" | "Placement";
```

New code MUST NOT use `user.role === "Director"` as an authorization check. Always use `resolveAuthorizationProfile(user).hasLeadershipPortalAccess` or the `assertLeadershipApiAccess()` guard. The legacy values exist for backward compatibility with older records only.

### I5 — `createAuditLog` without `dbConnect()`

The current `src/lib/audit/service.ts` does not call `dbConnect()` at the top of `createAuditLog()`. This works today because all callers have already connected, but creates a fragile implicit dependency. The fix (add `await dbConnect()` as the first line of `createAuditLog`) is tracked in [10_Technical_Debt_Report.md](10_Technical_Debt_Report.md).

### I6 — Faculty layout not a Client shell

`src/app/(faculty-protected)/faculty/layout.tsx` is the only role layout that is not backed by a dedicated Client shell component. It has no active-nav highlighting and embeds nav logic inline. Migrate to a `FacultyShell` component per [07_Frontend_Architecture.md §14 R7](07_Frontend_Architecture.md#14-recommended-solutions).

### I7 — Hard-coded path in `scripts/ts-alias-loader.mjs`

`scripts/ts-alias-loader.mjs` hard-codes `/Users/rc/Projects/operant-next/src`. This breaks on every developer machine. Fix: use `path.resolve(process.cwd(), "src")` instead.

### I8 — React Flow and xlsx CSS/bundles loaded on all pages

`@xyflow/react/dist/style.css` is imported in `globals.css`, loading it for every page. Both React Flow and xlsx are statically imported without `next/dynamic`. Fix per [07_Frontend_Architecture.md §14 R5](07_Frontend_Architecture.md#14-recommended-solutions).

---

## 14. PR Checklist

Complete this checklist before requesting review on any pull request. Check off items that do not apply with `N/A`.

```markdown
## PR Checklist

### Correctness
- [ ] New server pages live inside the correct `(…-protected)` route group
- [ ] Every new API route calls the appropriate auth guard as the first statement
- [ ] Dynamic route params are awaited: `const { id } = await context.params`
- [ ] Zod parsing is inside the service, not the route handler
- [ ] `dbConnect()` is the first call in every service function
- [ ] Service writes are followed by `createAuditLog`
- [ ] Success responses use the `{ message, <entity> }` envelope
- [ ] All responses pass through `createApiErrorResponse` in the catch block

### Data layer
- [ ] New models follow the canonical pattern (interface, timestamps, collection name, registration guard)
- [ ] Enum values exported as `as const` array and imported by Zod validators
- [ ] Scope block included on any plan/assignment/reporting record
- [ ] Compound indexes declared for all multi-field query patterns
- [ ] `JSON.parse(JSON.stringify(...))` applied before passing Mongoose docs as RSC props or API responses

### Frontend
- [ ] New interactive components have `"use client"` only when needed
- [ ] New forms use react-hook-form + zodResolver (Paradigm A)
- [ ] `cn()` used for all conditional class composition
- [ ] Heavy libs (React Flow, xlsx) use `next/dynamic` with `ssr: false`
- [ ] New pages have `loading.tsx` and `error.tsx` (or inherit from group layout)

### Quality
- [ ] No `console.log` left in production code paths
- [ ] No commented-out code blocks
- [ ] Exported service functions have JSDoc
- [ ] New business logic has at least one unit test
- [ ] `npm run lint` passes with no new warnings
- [ ] `npm test` passes

### Naming & placement
- [ ] Files are `kebab-case.ts(x)`
- [ ] Model registration name is `PascalCase`, collection name is `snake_case`
- [ ] Component family suffix is correct (`-manager`, `-review-board`, `-contributor-workspace`, `-dashboard`)
- [ ] New `lib` code is in the correct domain folder with `service.ts` and `validators.ts`
```
