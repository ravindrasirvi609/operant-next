# AQAR System — Implementation Documentation

## 1. Scope

The AQAR (Annual Quality Assurance Report) module tracks individual faculty contributions
for NAAC accreditation. Each faculty member submits one `AqarApplication` per academic year,
which captures research, awards, patents, books, FDPs, and other contributions in a
structured NAAC-aligned format.

These individual submissions feed into the institution-level `AqarCycle`, which aggregates
data across all faculty and produces the final NAAC AQAR report.

---

## 2. Data Model

### 2.1 AqarApplication (`aqar_applications`)

Model: `src/models/core/aqar-application.ts`

Key fields:

| Field | Type | Purpose |
|---|---|---|
| `facultyId` | ObjectId → Faculty | Owner |
| `academicYearId` | ObjectId → AcademicYear | Academic year reference |
| `academicYear` | string | Human-readable label (e.g. "2023-24") |
| `reportingPeriod.fromDate / toDate` | string | NAAC reporting window |
| `facultyContribution` | embedded object | 12 sub-arrays of contribution data |
| `metrics` | embedded object | Computed counts + `totalContributionIndex` |
| `reviewCommittee` | array | Reviewer decisions recorded at each stage |
| `statusLogs` | array | Status transition history |
| `status` | AqarStatus | Current workflow stage |
| `submittedAt` | Date | Set on first submit |

Indexes:
- `(facultyId, academicYear)` — **unique** (enforces one application per faculty per year)
- `(facultyId, academicYearId)` — sparse secondary lookup
- `(facultyId, status, updatedAt)` — faculty dashboard listing

### 2.2 AqarCycle (`aqar_cycles`)

Model: `src/models/core/aqar-cycle.ts`

Institutional AQAR report document. Aggregates `AqarApplication` counts via
`AqarApplication.countDocuments(...)` to populate NAAC criterion metrics.

---

## 3. Status Workflow

```
Faculty                  Dept Head / Director         Committee / IQAC         Principal / Admin
   │                             │                           │                        │
   ├─[create]──► Draft           │                           │                        │
   │                             │                           │                        │
   ├─[submit]──► Submitted ──────┤                           │                        │
   │             │               ├─[approve]──► Under Review─┤                        │
   │             │               │              │            ├─[approve]──► Committee Review
   │             │               ├─[reject]─►   │            │              │         ├─[approve]──► Approved
   │             │               │           Rejected        ├─[reject]──►  │         │
   │◄────────────┤               │              ▲            │           Rejected     ├─[reject]──► Rejected
   │           Rejected          │              │            │                        │
   ├─[resubmit after reject]─────┘              │            └────────────────────────┘
```

### 3.1 Status transition table

| From | Action | To | Authorized roles |
|---|---|---|---|
| Draft | submit | Submitted | Faculty (owner) |
| Rejected | submit | Submitted | Faculty (owner) |
| Submitted | approve | Under Review | DEPARTMENT_HEAD, DIRECTOR |
| Submitted | reject | Rejected | DEPARTMENT_HEAD, DIRECTOR |
| Under Review | approve | Committee Review | AQAR_COMMITTEE, IQAC, DIRECTOR |
| Under Review | reject | Rejected | AQAR_COMMITTEE, IQAC, DIRECTOR |
| Committee Review | approve | Approved | PRINCIPAL, Admin |
| Committee Review | reject | Rejected | PRINCIPAL, Admin |

A `reject` at any stage sets status directly to `"Rejected"` — there is no multi-step
rejection path. A rejected application can be edited and resubmitted by the faculty.

---

## 4. API Surface

| Method | Route | Service function | Notes |
|---|---|---|---|
| POST | `/api/aqar` | `createAqarApplication` | Faculty only; one per academic year |
| GET | `/api/aqar/faculty` | `getFacultyAqarApplications` | Faculty only |
| GET | `/api/aqar/[id]` | `getAqarApplicationById` | Role-gated |
| PUT | `/api/aqar/[id]` | `updateAqarApplication` | Draft/Rejected only |
| DELETE | `/api/aqar/[id]` | `deleteAqarApplication` | Draft/Rejected, faculty owner only |
| POST | `/api/aqar/[id]/submit` | `submitAqarApplication` | Draft/Rejected only |
| POST | `/api/aqar/[id]/review` | `reviewAqarApplication` | Review-stage roles |
| POST | `/api/aqar/[id]/approve` | `approveAqarApplication` | Committee Review stage only |
| GET | `/api/aqar/[id]/report` | `getAqarApplicationById` + PDF builder | Any authorized viewer |

`getAqarReviewQueue` and `getAqarScopedApplications` are consumed by server components
(director/admin pages) rather than exposed as standalone API routes.

---

## 5. `facultyContribution` Structure

The `facultyContribution` embedded object contains 12 sub-arrays of NAAC-aligned data:

| Sub-array | Purpose | Required fields |
|---|---|---|
| `researchPapers` | Journal/conference publications | paperTitle, journalName, authors, publicationYear |
| `seedMoneyProjects` | Research projects with external funding | projectTitle, PI name, fundingAgency, awardYear |
| `awardsRecognition` | Awards received by faculty | teacherName, awardName, level, awardAgencyName |
| `fellowships` | Fellowships and support received | teacherName, fellowshipName, awardingAgency, awardYear |
| `researchFellows` | PhD/research fellows supervised | fellowName, fellowshipType, grantingAgency |
| `patents` | Patent filings and grants | type, patenterName, title, status, level |
| `phdAwards` | PhD degrees awarded/submitted under faculty guidance | scholarName, guideName, thesisTitle, awardStatus |
| `booksChapters` | Books and book chapters authored | type, titleOfWork |
| `eContentDeveloped` | E-learning content created | moduleName, creationType, platform |
| `consultancyServices` | External consultancy work | consultantName, projectName, sponsoringAgency |
| `financialSupport` | Conference/event financial support received | conferenceName |
| `facultyDevelopmentProgrammes` | FDPs attended | programTitle, organizedBy |

All sub-arrays use `{ _id: false }` sub-schemas — no per-item ObjectIds are generated.
Files/proofs are stored as `proof: string` (URL or storage path).

---

## 6. Metrics Computation

`computeAqarMetrics(input)` (private, `src/lib/aqar/service.ts`) calculates item counts
for each sub-array and a weighted `totalContributionIndex`:

```
totalContributionIndex =
  researchPapers × 5  +  seedMoneyProjects × 5  +  awardsRecognition × 4  +
  fellowships × 4     +  researchFellows × 3    +  patents × 5            +
  phdAwards × 5       +  booksChapters × 4       +  eContent × 3          +
  consultancy × 4     +  financialSupport × 2    +  fdp × 2
```

`totalContributionIndex > 0` is required before submission (`submitAqarApplication` line ~439).

The metrics object is stored on `AqarApplication.metrics` and updated on every save.

---

## 7. Role Permissions Summary

| Action | Faculty (owner) | Dept Head / Director | Committee / IQAC | Principal | Admin |
|---|---|---|---|---|---|
| Create | ✅ | ✗ | ✗ | ✗ | ✗ |
| View | ✅ (own) | ✅ (scoped) | ✅ (scoped) | ✅ (scoped) | ✅ (all) |
| Update | ✅ Draft/Rejected | ✗ | ✗ | ✗ | ✗ |
| Delete | ✅ Draft/Rejected | ✗ | ✗ | ✗ | ✗ |
| Submit | ✅ Draft/Rejected | ✗ | ✗ | ✗ | ✗ |
| Review (forward/reject) | ✗ | ✅ (Submitted stage) | ✅ (Under Review stage) | ✗ | ✅ (override) |
| Final approve/reject | ✗ | ✗ | ✗ | ✅ | ✅ |

Break-glass override: Admins with `canUseBreakGlassOverride` can review or approve at any
stage by providing `overrideReason`; the action is logged with a `_OVERRIDE` audit action.

---

## 8. Known Gaps

### 8.1 Data duplication with faculty module records (deferred — Phase 5)

Eight of the 12 `facultyContribution` sub-arrays overlap with dedicated faculty workspace
models:

| AQAR sub-array | Faculty module model |
|---|---|
| `researchPapers` | `FacultyPublication` |
| `seedMoneyProjects` | `FacultyResearchProject` |
| `awardsRecognition` | `FacultyAward` |
| `patents` | `FacultyPatent` |
| `phdAwards` | `FacultyPhdGuidance` |
| `booksChapters` | `FacultyBook` |
| `eContentDeveloped` | `FacultyEcontent` |
| `consultancyServices` | `FacultyConsultancy` |

There is no FK link and no synchronization — faculty must re-enter data already present in
their workspace. This is intentional in the current design (AQAR data is NAAC-specific and
may differ from workspace records in level, year, and proof format).

**Phase 5 design options:**
1. Keep as-is (separate entry, intentional)
2. Add an "import from profile" helper that pre-fills AQAR arrays from workspace records
3. Replace embedded arrays with FK references to the workspace models

A decision is required before Phase 5 implementation begins.

### 8.2 AQAR cycle metrics use document count, not contribution counts

`aqar-cycle/service.ts` reads `AqarApplication.countDocuments(...)` for NAAC criterion
metrics — it counts submitted applications, not the number of items within each sub-array.
If NAAC requires per-item counts (e.g., total research papers across all faculty), the
`metrics` sub-document fields should be aggregated instead.

---

## 10. Import from Profile (Phase 5)

### 10.1 Overview

Faculty can pre-fill their AQAR contribution form with records already entered in their
faculty workspace modules. This eliminates duplicate data entry for the 8 sub-arrays that
have matching workspace models.

### 10.2 API endpoint

```
GET /api/aqar/[id]/import-candidates
```

- **Auth**: Faculty owner only (same ownership check as `updateAqarApplication`).
- **Returns**: A partial `facultyContribution` object with 8 pre-filled arrays.
- **Does not write**: The response is candidates only; the client decides which items to merge
  into the live contribution.

### 10.3 Sub-arrays covered

| `facultyContribution` sub-array | Workspace model | Date filter |
|---|---|---|
| `researchPapers` | `FacultyPublication` (non-Book) | `publicationDate` in academic window |
| `seedMoneyProjects` | `FacultyResearchProject` | `startDate` or `endDate` in window |
| `awardsRecognition` | `FacultyAward` | `awardDate` in window |
| `patents` | `FacultyPatent` | `filingDate` or `grantDate` in window |
| `phdAwards` | `FacultyPhdGuidance` | `completionYear` in window, or ongoing |
| `booksChapters` | `FacultyBook` | `publicationDate` in window |
| `eContentDeveloped` | `FacultyEcontent` | exact `academicYearId` match |
| `consultancyServices` | `FacultyConsultancy` | `startDate` or `endDate` in window |

### 10.4 Sub-arrays without workspace source

`fellowships`, `researchFellows`, `financialSupport`, `facultyDevelopmentProgrammes` —
these four arrays have no faculty workspace model. They are excluded from the import payload
so existing manual entries in the form are preserved.

### 10.5 Field mapping notes

- Fields with no direct workspace equivalent (PAN, designation, `fundingAgencyType`, proof
  URLs) are pre-filled as empty string `""` — the faculty fills them manually.
- `FacultyAward.awardLevel = "College"` maps to AQAR `level = "State"` (closest equivalent).
- `FacultyPatent.status = "Granted"` → AQAR `type = "Product"`; other statuses → `"Process"`.
- `FacultyPhdGuidance.status = "completed"` → AQAR `awardStatus = "Awarded"`;
  `"ongoing"` → `"Submitted"`.

### 10.6 Academic year window

Same June 1 → May 31 convention used by PBAS (`src/lib/pbas/references.ts`).
Duplicated as a private helper in `src/lib/aqar/references.ts` rather than exported from
PBAS to keep module boundaries clean.

---

## 9. Compliance Checklist

Run before each AQAR reporting cycle:

- [ ] Active academic year configured in Admin > Academics
- [ ] AQAR cycle record created and reporting period set
- [ ] Faculty deadline reminder configured (`AqarCycle.reportingPeriod.toDate`)
- [ ] All faculty have created and submitted their AQAR applications
- [ ] Department heads have forwarded all Submitted applications
- [ ] AQAR committee has reviewed all Under-Review applications
- [ ] Principal/Admin has approved or rejected all Committee-Review applications
- [ ] `AqarCycle` report generated after all applications reach Approved status
- [ ] PDF report export verified for a representative sample
