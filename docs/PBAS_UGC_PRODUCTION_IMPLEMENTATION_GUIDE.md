# PBAS Production Implementation Guide (UGC-Aligned)

## 1. Purpose

This document defines a production-ready PBAS implementation flow for a large web application, aligned with UGC-style API/PBAS expectations and common institutional practice.

It also provides:

- verified-source traceability
- target workflow design
- compliance controls
- implementation gaps identified in current codebase
- detailed remediation plan

## 2. Verified Source Baseline

## 2.1 Primary regulatory intent

The implementation should follow the intent of UGC 2018-era API/Academic-Research score methodology (Appendix-style Table-2 usage across institutions), where assessment is evidence-backed and category-wise scoring is explicit.

## 2.2 Source traceability and confidence

Because many official sources are PDF-first and occasionally unavailable or extraction-hostile, use a confidence model:

1. Tier A (authoritative): UGC official regulations/circular repository URLs.
2. Tier B (institutional republications): university PDF copies of Table-2 methodology.
3. Tier C (search-index snippets): discoverability evidence, not final legal source.

Use this operating rule in production governance:

- No scoring rule should be considered final unless legal/academic governance signs off against Tier A or validated Tier B source.

## 2.3 Verified statements currently confirmed

From cross-source discoverability and institutional Table-2 mirrors:

- PBAS/API scoring is expected to be evidence-based.
- Category-wise scoring methodology is expected (teaching/research/institutional or equivalent institutional mapping).
- Activity-level scoring logic usually includes publications, projects, patents, guidance, institutional duties, and outreach variants.

## 2.4 Source appendix (for governance verification)

Use these as discovery references and governance checkpoints:

1. UGC official site: https://www.ugc.gov.in/
2. UGC regulations section: https://www.ugc.gov.in/regulations
3. UGC regulation document endpoint observed during research: https://www.ugc.gov.in/pdfnews/5323630_New-Regulations.pdf
4. Table-2 discoverability index page used for source discovery: https://html.duckduckgo.com/html/?q=Appendix+II+Table+2+Methodology+for+University+and+College+Teachers+for+calculating+Academic+Research+Score
5. Example institutional Table-2 mirror surfaced by search index: http://kufos.ac.in/wp-content/uploads/2025/08/Table-2.pdf
6. Example institutional Table-2 mirror surfaced by search index: https://iegindia.org/wp-content/uploads/2024/04/API_format_in_Table_2_Appendix_II.pdf

Important:

- Items 5 and 6 are mirror-style references. Final institutional policy should be approved only after legal/academic verification against authoritative UGC text and institution circulars.

## 2.5 Source verification protocol for your project

Before activating or changing PBAS scoring rules:

1. Download authoritative source and compute file hash.
2. Store hash, URL, download date, and approver in policy governance records.
3. Mark policy pack as Draft until legal and academic approvers sign.
4. Run regression tests against approved policy examples.
5. Activate policy with effective date and immutable version tag.

## 3. UGC-Aligned Target PBAS Flow

## 3.1 Governance flow

1. Faculty creates annual draft.
2. Faculty selects eligible source records for the appraisal year.
3. System computes claimed score via policy rules.
4. Faculty uploads/maps evidence per claim.
5. Submission lock creates immutable revision snapshot.
6. Department-level review and moderation occurs.
7. Committee/admin-level review finalizes approved score.
8. Final decision locks record and preserves full audit trail.
9. Approved output is available for CAS/NAAC/AQAR downstream modules.

## 3.2 Data flow (required production chain)

1. Source records (teaching/research/institutional) are collected by academic year.
2. Source references are explicitly selected (include/exclude).
3. Scoring engine applies policy version and generates claim-level score lines.
4. Totals are derived from approved claim lines, not ad-hoc manual fields.
5. Immutable revision stores:
   - selected references
   - scoring policy version
   - line-item score breakdown
   - evidence mappings
   - computed totals
6. Review actions append immutable event logs.

## 3.3 Control flow (hard checks)

At draft save:

- validate date and academic-year coherence
- validate source ownership
- validate indicator eligibility by designation/discipline

At submit:

- enforce submission window
- enforce required evidence rules
- enforce non-zero and rule-consistent totals
- freeze revision and hash important fields (optional but recommended)

At moderation/approval:

- enforce reviewer role authorization
- enforce moderation boundaries (approved <= allowed cap)
- require remarks on negative/override decisions

## 4. Production-Grade Architecture Pattern

## 4.1 Policy-pack driven scoring (mandatory for scale)

Introduce a versioned policy model:

- policyId, version, effectiveFrom, effectiveTo
- applicable track: designation, discipline, institution type
- indicator rules: formulas, caps, evidence requirements, split logic
- reviewer constraints and delegation rules

The scoring engine should evaluate by policy package at runtime and store policy version in each revision.

## 4.2 Traceable score lines

Every computed score should be explainable as:

- rule id
- input values
- before-cap score
- cap applied
- final claimed score

This is required for auditability and user trust.

## 4.3 Idempotent and transactional state changes

Submission/review/finalization should run in DB transaction boundaries to prevent partial updates between form, entries, revision, and workflow logs.

## 4.4 Separation of concerns

- Source aggregation service
- Policy evaluation engine
- Evidence validation service
- Workflow transition service
- Reporting/export service

Do not couple these into a single service path as scale grows.

## 5. Current Implementation Review (Codebase-Specific)

This section maps critical gaps against current implementation.

## 5.1 What is strong already

- Dynamic master structure for categories and indicators exists in [src/lib/pbas/catalog.ts](src/lib/pbas/catalog.ts).
- Faculty form + revision + entries model exists.
- Draft references and snapshot assembly pipeline exists.
- Workflow statuses and review APIs exist.
- Summary and report generation are implemented.

## 5.2 High-priority gaps and risks

### Gap A: Missing per-indicator cap enforcement at write-time

- Risk: over-claim or over-approve values can be persisted.
- Code anchors:
  - entry write path [src/lib/pbas/service.ts](src/lib/pbas/service.ts#L863)
  - moderation validation only min(0) [src/lib/pbas/validators.ts](src/lib/pbas/validators.ts#L193)
  - moderation persistence [src/lib/pbas/service.ts](src/lib/pbas/service.ts#L919)

### Gap B: Evidence ownership and linkage integrity checks are insufficient

- Risk: unrelated document IDs may be attached if not ownership-validated.
- Code anchor: evidence assignment path [src/lib/pbas/service.ts](src/lib/pbas/service.ts#L902)

### Gap C: Indicator catalog and score computation are not fully aligned

- Risk: many indicator masters exist but truth score comes from snapshot heuristics and totals sync.
- Code anchors:
  - scoring formula path [src/lib/pbas/service.ts](src/lib/pbas/service.ts#L250)
  - totals upsert from computed apiScore [src/lib/pbas/migration.ts](src/lib/pbas/migration.ts#L148)
  - UI prioritizes _TOTAL view [src/components/pbas/pbas-dashboard.tsx](src/components/pbas/pbas-dashboard.tsx#L428)

### Gap D: Institutional source selection granularity is collapsed

- Risk: committee/admin/exam selections share the same reference bucket, reducing traceability.
- Code anchors:
  - shared reference usage [src/components/pbas/pbas-dashboard.tsx](src/components/pbas/pbas-dashboard.tsx#L636)
  - shared reference usage [src/components/pbas/pbas-dashboard.tsx](src/components/pbas/pbas-dashboard.tsx#L646)
  - shared reference usage [src/components/pbas/pbas-dashboard.tsx](src/components/pbas/pbas-dashboard.tsx#L656)

### Gap E: Date and period validation is too weak for compliance records

- Risk: invalid date ranges can pass and contaminate official appraisal records.
- Code anchors:
  - current schema uses basic string min length [src/lib/pbas/validators.ts](src/lib/pbas/validators.ts#L110)
  - parsing happens later [src/lib/pbas/service.ts](src/lib/pbas/service.ts#L565)

### Gap F: Status timeline noise from draft autosave

- Risk: logs become noisy and less audit-meaningful.
- Code anchors:
  - autosave trigger [src/components/pbas/pbas-dashboard.tsx](src/components/pbas/pbas-dashboard.tsx#L747)
  - status log push on update [src/lib/pbas/service.ts](src/lib/pbas/service.ts#L1164)

### Gap G: Delete operation may leave dependent artifacts

- Risk: orphan revisions/entries and weak referential hygiene.
- Code anchor: delete path [src/lib/pbas/service.ts](src/lib/pbas/service.ts#L1202)

## 5.3 Medium-priority gaps

### Gap H: Heuristic scoring signals require policy-version hardening

- Keyword-based publication/conference/patent mapping can drift from institution policy revisions.
- Code anchors:
  - research paper heuristic [src/lib/pbas/service.ts](src/lib/pbas/service.ts#L104)
  - patent heuristic [src/lib/pbas/service.ts](src/lib/pbas/service.ts#L118)
  - conference heuristic [src/lib/pbas/service.ts](src/lib/pbas/service.ts#L132)
  - project slab heuristic [src/lib/pbas/service.ts](src/lib/pbas/service.ts#L146)

### Gap I: One-active-form rule is good but lifecycle constraints can be stronger

- Add strict transition matrix and invalid state-transition rejection table.

## 6. Detailed Missing Implementation Checklist

## 6.1 Validation and integrity

1. Enforce claimedScore <= indicator.maxScore.
2. Enforce approvedScore <= min(indicator.maxScore, policy-allowed maximum).
3. Enforce evidence mandatory rules for configured indicator classes.
4. Validate evidence ownership: faculty + year + record linkage.
5. Validate appraisalPeriod inside selected academic year bounds.
6. Reject overlapping appraisal periods for same faculty/year.

## 6.2 Workflow correctness

1. Define and enforce transition table (Draft -> Submitted -> Under Review -> Committee Review -> Approved/Rejected).
2. Require remarks for rejection and score overrides.
3. Record reviewer role and authority basis at each decision point.
4. Keep a separate event stream for autosave vs status transitions.

## 6.3 Dynamic policy engine

1. Add policy master with versioning and effective windows.
2. Attach policyVersionId to each revision.
3. Store per-line scoring explanations.
4. Implement dry-run score comparison for policy updates before activation.

## 6.4 Data model hardening

1. Add integrity constraints for evidence foreign keys.
2. Add cascading/soft-delete strategy for form deletion.
3. Add unique constraints for revision line items beyond basic pair keys where needed.
4. Add immutable fields on approved revisions.

## 6.5 Observability and audit

1. Add structured audit event IDs (correlationId/traceId).
2. Add compliance export endpoint for regulator review packets.
3. Add anomaly alerts for impossible score jumps and missing evidence patterns.

## 6.6 Performance and scale

1. Add pagination and cursor strategy for review boards.
2. Add projection-only list endpoints for high-volume dashboards.
3. Add background job for revision consistency checks.
4. Add caching of policy packs and category masters.

## 7. Clean Production Implementation Blueprint

## 7.1 Phase 1 (Immediate hardening)

- cap enforcement
- evidence ownership validation
- strict date validation
- autosave/status log separation
- safe delete cascade policy

## 7.2 Phase 2 (Deterministic scoring)

- align indicator entries and computed totals to one source of truth
- expand moderation constraints
- add rule-based explainable score lines

## 7.3 Phase 3 (Enterprise policy framework)

- versioned policy packs
- backward-compatible migration tools
- legal-governance signoff workflow
- compliance regression suite

## 8. Test and Release Readiness Matrix

Before go-live, all must pass:

1. Unit tests for every indicator scoring rule.
2. Integration tests for full workflow transitions.
3. Security tests for evidence-link tampering.
4. Migration tests for legacy-to-dynamic records.
5. Snapshot reproducibility tests (same inputs => same score outputs).
6. Approval audit packet generation test.

## 9. Definition of Done (Production)

PBAS module is production-ready only when:

1. All high-priority gaps in Section 5.2 are closed.
2. Policy pack versioning is active and traceable in revisions.
3. Every approved score is explainable and evidence-backed.
4. Workflow is transaction-safe and audit-complete.
5. Compliance and regression test suite is green.

## 10. Immediate Engineering Actions for This Repository

Recommended first implementation pull request should include:

1. Entry and moderation max-score validations.
2. Evidence ownership verification in entry upsert path.
3. Strict date refinement in PBAS validators.
4. Status log cleanup (no status push for autosave).
5. Delete cleanup strategy for revisions/entries.
6. Institutional source reference split for committee/admin/exam categories.

After this, proceed with policy-pack architecture in a dedicated second PR.

## 11. Implementation Progress Snapshot

Status as of 2026-03-19 in this repository:

Completed in code (Phase 1 + 1.1):

1. Strict academic-year and appraisal-period validation.
2. Claimed score cap validation against indicator max.
3. Approved score cap and claimed-score boundary validation.
4. Duplicate moderation update prevention.
5. Evidence ownership validation (uploader enforcement).
6. Evidence cross-context conflict protection (faculty/year mismatch rejection).
7. Autosave status-log noise removed.
8. Transactional delete cleanup for PBAS form dependencies.
9. Transactional write paths for submit/review/approve transitions.
10. Explicit PBAS transition matrix enforcement for submit/review/final approval.
11. Automated unit tests for validator hardening and transition rules.

Remaining (recommended next):

1. Expand test coverage to DB-backed integration cases for transaction rollback paths.
2. Introduce policy-pack version tables and explainable score lines.
3. Add compliance export endpoint for regulator packet generation.
4. Add score-rule change approval workflow with governance signoff metadata.
