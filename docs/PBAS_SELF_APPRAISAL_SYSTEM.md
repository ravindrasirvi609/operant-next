# PBAS Self Appraisal System - Implementation Documentation

## 1. Scope
This document describes the PBAS Self Appraisal implementation currently present in this application.

It is aligned to the PBAS core structure from your Notion design:
- faculty_pbas_forms (root transaction)
- pbas_category_master (dynamic category master)
- pbas_indicator_master (dynamic indicator master)
- faculty_pbas_entries (dynamic per-indicator records)

## 2. Implementation Status Summary

### 2.1 Core PBAS module status
- Implemented: Yes
- Architecture: Dynamic PBAS with category and indicator masters
- Storage style: MongoDB (Mongoose models), normalized by references
- Workflow: Draft -> Submitted -> Under Review -> Committee Review -> Approved/Rejected
- Revisioning: Implemented (immutable submission revisions)
- Evidence mapping: Implemented (document references per indicator entry)

### 2.2 Verdict against Notion PBAS core
For the core PBAS requirement, implementation is correct and production-usable.
The four required entities are present and connected.

## 3. Data Model and Schema Mapping

## 3.1 Primary PBAS transaction model
Model: src/models/core/faculty-pbas-form.ts
Collection: faculty_pbas_forms

Key fields:
- facultyId (ref Faculty)
- academicYearId (ref AcademicYear)
- academicYear (string label)
- submissionStatus: Draft | Submitted | Locked
- status: Draft | Submitted | Under Review | Committee Review | Approved | Rejected
- currentDesignation
- appraisalPeriod { fromDate, toDate }
- draftReferences (selected source record IDs)
- activeRevisionId, latestSubmittedRevisionId
- apiScore { teachingActivities, researchAcademicContribution, institutionalResponsibilities, totalScore }
- reviewCommittee[]
- statusLogs[]

Indexes:
- unique (facultyId, academicYearId)
- (facultyId, submissionStatus, updatedAt)

## 3.2 PBAS category master
Model: src/models/core/pbas-category-master.ts
Collection: pbas_category_master

Fields:
- categoryCode (A/B/C)
- categoryName
- maxScore
- displayOrder

Indexes:
- unique (categoryCode)
- (displayOrder, categoryCode)

## 3.3 PBAS indicator master
Model: src/models/core/pbas-indicator-master.ts
Collection: pbas_indicator_master

Fields:
- categoryId (ref pbas_category_master)
- indicatorCode
- indicatorName
- description
- maxScore
- naacCriteriaCode

Indexes:
- unique (indicatorCode)
- (categoryId, indicatorCode)

## 3.4 Faculty PBAS entries (dynamic indicators)
Model: src/models/core/faculty-pbas-entry.ts
Collection: faculty_pbas_entries

Fields:
- pbasFormId (ref faculty_pbas_forms)
- pbasRevisionId (optional ref faculty_pbas_revisions)
- indicatorId (ref pbas_indicator_master)
- facultyId
- academicYearId
- claimedScore
- approvedScore
- evidenceDocumentId (ref Document)
- remarks

Indexes:
- unique draft entry: (pbasFormId, indicatorId) where pbasRevisionId does not exist
- unique revision entry: (pbasRevisionId, indicatorId) where pbasRevisionId exists
- (facultyId, academicYearId)

## 3.5 PBAS revision snapshots
Model: src/models/core/faculty-pbas-revision.ts
Collection: faculty_pbas_revisions

Purpose:
- Stores immutable submission snapshots for each submit event
- Preserves references and API score by revisionNumber

Fields:
- pbasFormId
- revisionNumber
- submittedAt/submittedBy
- approvedAt/approvedBy
- migrationSource
- backfillIntegrity
- references
- snapshot
- apiScore

## 3.6 Legacy compatibility layer
Models:
- src/models/core/pbas-application.ts (legacy)
- src/models/core/pbas-id-alias.ts

Purpose:
- Supports migration from legacy PBAS collection
- Allows ID alias resolution from legacy IDs to canonical IDs

## 4. PBAS Source Data Integration

PBAS is derived from faculty workspace data via references and snapshots.

Resolved from these modules:
- teaching summary/load/result
- publications
- books
- patents
- research projects
- event participation (conference-type)
- admin roles
- institutional contributions
- social extension

Reference resolver: src/lib/pbas/references.ts

## 5. Scoring Engine

Service: src/lib/pbas/service.ts
Function: computePbasApiScore

Current scoring categories:
- Category A: Teaching activities (cap 100)
- Category B: Research and academic contribution (cap 120)
- Category C: Institutional responsibilities (cap 80)

Total API score:
- totalScore = A + B + C

Note:
- Formula is now configurable through admin-managed scoring weights in MasterData (category: pbas_settings, key: scoring_weights)
- Runtime scoring uses the DB-configured weights with safe fallback defaults

## 6. Workflow and Role Control

Service: src/lib/pbas/service.ts

Main transitions:
- Faculty: create/update/delete draft, submit
- Director/Department head flow: review and forward/recommend/reject
- Admin: final approve/reject

Rules enforced:
- Only one active PBAS form per faculty at a time (active statuses set)
- Edit allowed only in Draft/Rejected
- Submit blocked if computed totalScore <= 0
- Submit blocked when configured PBAS submission deadline is passed (MasterData: pbas_settings/submission_deadline)
- Final approval locks submission status
- Per-indicator approved score moderation allowed during review stages (Submitted/Under Review/Committee Review) for reviewer/admin roles

Audit and governance:
- ApprovalWorkflow upsert on transitions
- AuditLog entries for create/update/submit/review/approve

## 7. API Surface

### Faculty-side PBAS APIs
- POST /api/pbas
- GET /api/pbas/faculty
- GET /api/pbas/summary
- GET /api/pbas/[id]
- PUT /api/pbas/[id]
- DELETE /api/pbas/[id]
- POST /api/pbas/[id]/submit
- GET /api/pbas/[id]/entries
- POST /api/pbas/[id]/entries
- PUT /api/pbas/[id]/references
- POST /api/pbas/[id]/entries/moderate
- GET /api/pbas/[id]/report

### Review and approval APIs
- POST /api/pbas/[id]/review
- POST /api/pbas/[id]/approve

### Admin catalog/migration APIs
- POST /api/admin/pbas/seed
- POST /api/admin/pbas/backfill
- GET /api/admin/pbas/settings
- PATCH /api/admin/pbas/settings
- category and indicator CRUD under /api/admin/pbas/categories and /api/admin/pbas/indicators

## 8. UI Coverage

Faculty UI:
- src/components/pbas/pbas-dashboard.tsx
- features: draft creation, autosave metadata, source selection, entry evidence upload, submit, revision history, PDF download, and score preview aligned to DB-managed scoring weights

Review UI:
- src/components/pbas/pbas-review-board.tsx
- used by director and admin review pages
- includes per-indicator approved-score moderation panel with save flow

Admin catalog UI:
- src/components/admin/pbas-catalog-manager.tsx
- category/indicator CRUD + seed + scoring settings editor (submission deadline and scoring weights JSON)

## 9. What Is Correctly Implemented

- Dynamic category and indicator master design
- Per-form dynamic indicator entries
- Evidence mapping to document IDs
- Reference-based snapshot assembly from faculty records
- Multi-stage workflow and status timeline
- Revision history for submissions
- Admin seeding and legacy migration support
- Summary API and report PDF generation
- Strict submit-deadline enforcement at submit API
- DB-configurable scoring engine (admin-managed)
- Per-indicator moderation API + review/admin UI

## 10. Gaps and Improvement Opportunities

These are not blockers for PBAS core, but are important enhancements:

1. Workflow separation depth
- Review committee records are embedded in form document.
- If institutional policy needs richer committee workflows, a dedicated workflow/assignment model can be introduced.

## 11. Recommended Compliance Checklist

Run this checklist each release:

- PBAS category and indicator seed loaded
- Active academic year configured
- Faculty workspace data present for teaching/research/institutional sources
- Draft creation and autosave functioning
- Source include/exclude reference update working
- Entry evidence upload and mapping working
- Submit transition creates revision
- Director/Admin review transitions recorded
- Final approval locks form and marks revision approved
- PDF generation works
- AQAR integration consumes approved PBAS counts correctly

## 12. Conclusion

The PBAS Self Appraisal System is implemented and operational with a dynamic, schema-aligned architecture.
For your Notion PBAS core requirement, this application is correctly implemented.

Main next step for enterprise maturity is deeper workflow assignment orchestration and policy-level audit/report configuration.
