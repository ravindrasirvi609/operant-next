# UMIS (operant-next) — Architecture & Development Master Plan

**Single source of truth** for understanding, reviewing, and evolving the UMIS platform into a scalable, maintainable, enterprise-grade Higher-Education **Accreditation & Quality-Assurance** system (NAAC · AQAR · NIRF · AISHE · PBAS · CAS · SSR · IQAC).

This suite is the outcome of a full software-architecture review performed against the **actual codebase** (`c:\Users\C839248\operant-next`). Nothing here is invented — every claim traces to real files, models, routes, and components. Where the review recommends change, documents clearly separate **Current State → Problems Identified → Recommended Solution → Implementation Plan**.

> The condensed, single-file technical reference lives at [`../documentation.md`](../documentation.md). This `/docs` suite expands it into an actionable, cross-referenced architecture-and-transformation blueprint.

---

## Table of Contents

- [Purpose & Final Goal](#purpose--final-goal)
- [How to Use This Suite (reading paths)](#how-to-use-this-suite-reading-paths)
- [Document Map](#document-map)
- [Diagrams](#diagrams)
- [Relationship to Existing Docs](#relationship-to-existing-docs)
- [Documentation Standards](#documentation-standards)
- [At-a-Glance Facts](#at-a-glance-facts)
- [Maintenance](#maintenance)

---

## Purpose & Final Goal

UMIS is a **modular-monolith** Next.js 16 (App Router) + MongoDB/Mongoose application through which faculty and students contribute accreditation evidence, institutional committees review and approve it, and administrators compile it into the reports demanded by Indian regulators. It has grown organically and now carries duplicated code, inconsistent implementations, and architectural debt.

The goal of this suite is to enable **any new developer or architect** to:

1. Understand the business domain and the as-built system quickly.
2. See exactly where the current limitations and risks are, with evidence.
3. Follow a **prioritized, incremental roadmap** to evolve UMIS into a clean, scalable, secure, enterprise-grade product — without a risky big-bang rewrite.

## How to Use This Suite (reading paths)

| I am a… | Read in this order |
|---|---|
| **New developer (onboarding)** | [01](01_Project_Overview.md) → [03](03_Business_Domain.md) → [02](02_Current_Architecture.md) → [04](04_Module_Documentation.md) → [18](18_Coding_Standards.md) |
| **Architect / Tech Lead** | [02](02_Current_Architecture.md) → [09](09_Code_Quality_Report.md) → [10](10_Technical_Debt_Report.md) → [11](11_Refactoring_Strategy.md) → [19](19_Future_Architecture.md) → [12](12_Development_Master_Plan.md) |
| **Engineering Manager / PM** | [01](01_Project_Overview.md) → [10](10_Technical_Debt_Report.md) → [12](12_Development_Master_Plan.md) → [13](13_Feature_Roadmap.md) |
| **Security reviewer** | [16](16_Security_Audit.md) → [07](07_Frontend_Architecture.md) → [08](08_Backend_Architecture.md) → [17](17_Performance_Optimization.md) |
| **Backend engineer** | [05](05_Database_Architecture.md) → [06](06_API_Documentation.md) → [08](08_Backend_Architecture.md) → [11](11_Refactoring_Strategy.md) |
| **Frontend engineer** | [07](07_Frontend_Architecture.md) → [18](18_Coding_Standards.md) → [04](04_Module_Documentation.md) |
| **QA / SDET** | [14](14_Testing_Strategy.md) → [06](06_API_Documentation.md) → [16](16_Security_Audit.md) |
| **DevOps / SRE** | [15](15_Deployment_Architecture.md) → [17](17_Performance_Optimization.md) → [16](16_Security_Audit.md) |

## Document Map

**Part I — Understand the system (as-built)**

| # | Document | Answers | Review phase |
|---|---|---|---|
| 01 | [Project Overview](01_Project_Overview.md) | Purpose, users, roles, workflows, strengths & weaknesses | Understand |
| 02 | [Current Architecture](02_Current_Architecture.md) | As-built architecture across every layer + diagrams | Understand |
| 03 | [Business Domain](03_Business_Domain.md) | Accreditation domain, glossary, bounded contexts | Understand |
| 04 | [Module Documentation](04_Module_Documentation.md) | Every module: purpose, rules, deps, impl, issues, fixes | Understand |
| 05 | [Database Architecture](05_Database_Architecture.md) | 188 models, scope-block multi-tenancy, ERD, issues | Understand |
| 06 | [API Documentation](06_API_Documentation.md) | 213 handlers, conventions, workflow endpoints, issues | Understand |
| 07 | [Frontend Architecture](07_Frontend_Architecture.md) | RSC/client split, components, forms, state, issues | Understand |
| 08 | [Backend Architecture](08_Backend_Architecture.md) | Route→service→model layering, cross-cutting infra, issues | Understand |

**Part II — Identify problems**

| # | Document | Answers | Review phase |
|---|---|---|---|
| 09 | [Code Quality Report](09_Code_Quality_Report.md) | Duplication, large files, coupling, dead code, naming | Identify |
| 10 | [Technical Debt Report](10_Technical_Debt_Report.md) | Categorized debt register (Critical→Low) with effort | Identify |
| 16 | [Security Audit](16_Security_Audit.md) | Auth/authz, CSRF, uploads, secrets — findings + fixes | Identify |
| 17 | [Performance Optimization](17_Performance_Optimization.md) | Queries, bundles, caching — findings + fixes | Identify |

**Part III — Plan the transformation**

| # | Document | Answers | Review phase |
|---|---|---|---|
| 11 | [Refactoring Strategy](11_Refactoring_Strategy.md) | Safe incremental refactor + module-by-module plan | Plan |
| 12 | [Development Master Plan](12_Development_Master_Plan.md) | **The phased blueprint** (goals/tasks/risks/acceptance) | Plan |
| 13 | [Feature Roadmap](13_Feature_Roadmap.md) | 1/3/6/12-month roadmap across all workstreams | Plan |
| 19 | [Future Architecture](19_Future_Architecture.md) | The enterprise-grade north-star architecture | Plan |

**Part IV — Standards & operations**

| # | Document | Answers | Review phase |
|---|---|---|---|
| 14 | [Testing Strategy](14_Testing_Strategy.md) | Test pyramid, tooling, what to test first | Standards |
| 15 | [Deployment Architecture](15_Deployment_Architecture.md) | Current + target deploy, CI/CD, migrations | Standards |
| 18 | [Coding Standards](18_Coding_Standards.md) | Mandatory conventions for all future work | Standards |

## Diagrams

Reusable Mermaid **source** files live in [`diagrams/`](diagrams/) (also embedded inline in the relevant documents):

- `system-context.mmd` — high-level system context
- `request-lifecycle.mmd` — page render + mutation lifecycle
- `auth-flow.mmd` — login / session / authorization resolution
- `database-erd.mmd` — core entity-relationship diagram
- `workflow-state-machine.mmd` — the shared contributor workflow
- `feature-relationships.mmd` — data roll-up to NAAC criteria
- `deployment-current.mmd` / `deployment-target.mmd` — deployment topology
- `future-architecture.mmd` — the target enterprise architecture

See [`diagrams/README.md`](diagrams/README.md).

## Relationship to Existing Docs

- [`../documentation.md`](../documentation.md) — the condensed one-file reference this suite is built upon.
- [`PBAS_SELF_APPRAISAL_SYSTEM.md`](PBAS_SELF_APPRAISAL_SYSTEM.md) and [`PBAS_UGC_PRODUCTION_IMPLEMENTATION_GUIDE.md`](PBAS_UGC_PRODUCTION_IMPLEMENTATION_GUIDE.md) — pre-existing PBAS design/implementation guides (preserved; referenced from [04](04_Module_Documentation.md)).

### Focused Deep-Dive Plans

Standalone, task-focused plans that complement the numbered suite:

- [CONTRIBUTOR_WORKFLOW_IMPROVEMENT_PLAN.md](CONTRIBUTOR_WORKFLOW_IMPROVEMENT_PLAN.md) — detailed, phased plan to streamline the end-to-end **contributor workflow** (Plan → Assignment → Contribution → Submit → multi-stage Review → Approve) and eliminate the six-way criterion-module duplication via a shared **Contributor Module Kernel**. Complements [11_Refactoring_Strategy.md](11_Refactoring_Strategy.md) and [08_Backend_Architecture.md](08_Backend_Architecture.md).

## Documentation Standards

Every document in this suite: is Markdown with a Table of Contents; cross-references related documents by relative link; includes Mermaid diagrams where they aid understanding; references **real** files/folders/models/APIs/components; is based on the current implementation without inventing features; and — where it proposes change — clearly separates **Current State**, **Problems Identified**, **Recommended Solution**, and **Implementation Plan**.

## At-a-Glance Facts

| Metric | Value |
|---|---|
| Framework / language | Next.js 16.1.6 (App Router), React 19.2.3, TypeScript 5 (strict) |
| Data store | MongoDB via Mongoose 9 — **188** model files, 10 categories |
| API surface | **213** route handlers (`route.ts`) |
| Pages / layouts | **73** `page.tsx`, **5** `layout.tsx` (no `middleware.ts`) |
| Components | **85** (`77` client) |
| Auth | Custom `jose` HS256 JWT cookie + `bcryptjs`; governance-based RBAC |
| Uploads / email | Firebase Storage (client SDK) / Resend |
| Automated tests | **4** Vitest unit tests |
| Architecture style | Modular monolith; RSC pages + thin API handlers + fat `lib` services |

## Maintenance

This suite reflects the codebase as reviewed. When the code and a document disagree, **the code is the source of truth** — update the affected document in the same change. Keep cross-references and the [Development Master Plan](12_Development_Master_Plan.md) status current as phases complete.
