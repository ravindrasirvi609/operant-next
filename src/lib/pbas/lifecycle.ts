import mongoose, { Types } from "mongoose";

import {
    formatAcademicYearLabel,
    parseAcademicYearLabel,
} from "@/lib/academic-year";
import dbConnect from "@/lib/dbConnect";
import { createAuditLog, type AuditRequestContext } from "@/lib/audit/service";
import {
    buildAuthorizedScopeQuery,
    canUseBreakGlassOverride,
    canViewModuleRecord,
    resolveAuthorizationProfile,
} from "@/lib/authorization/service";
import { AuthError } from "@/lib/auth/errors";
import { ensureFacultyContext } from "@/lib/faculty/migration";
import { designationOptions } from "@/lib/faculty/options";
import { applyFacultyWorkflowScope } from "@/lib/faculty/module-helpers";
import {
    buildStatusLogEntry,
    type SafeActor,
} from "@/lib/workflow/shared";
import {
    canActorProcessWorkflowStage,
    getActiveWorkflowDefinition,
    getWorkflowPendingStatuses,
    getWorkflowStageByStatus,
    listPendingWorkflowRecordIds,
    resolveWorkflowTransition,
    syncWorkflowInstanceState,
} from "@/lib/workflow/engine";
import {
    notifyPbasStageAssignment,
    notifyPbasFacultyOutcome,
} from "@/lib/pbas/notifications";
import {
    getPbasScoringWeightsFromMasterData,
    getPbasSubmissionDeadline,
} from "@/lib/pbas/admin";
import {
    computePbasDynamicScorecard,
    roundScore,
    type PbasDynamicScorecard,
} from "@/lib/pbas/scoring";
import {
    buildPbasSnapshot,
    deriveAutoDraftReferences,
    emptyPbasDraftReferences,
    loadPbasReferenceContext,
    type PbasReferenceContext,
    parsePbasDraftReferences,
    resolvePbasSnapshotFromReferences,
    selectPbasReferenceContext,
    sanitizeDraftReferences,
    serializePbasCandidatePools,
    serializePbasDraftReferences,
} from "@/lib/pbas/references";
import {
    pbasApplicationSchema,
    pbasApprovalSchema,
    pbasReviewSchema,
    type PbasDraftReferencesInput,
    type PbasScoringWeights,
    type PbasSnapshot,
} from "@/lib/pbas/validators";
import { ensurePbasDynamicMigration, resolveCanonicalPbasId, syncPbasTotalEntries } from "@/lib/pbas/migration";
import FacultyPbasForm, { type PbasStatus } from "@/models/core/faculty-pbas-form";
import FacultyPbasRevision, { type IFacultyPbasRevision } from "@/models/core/faculty-pbas-revision";
import FacultyPbasEntry from "@/models/core/faculty-pbas-entry";
import WorkflowInstance from "@/models/core/workflow-instance";
import AcademicYear from "@/models/reference/academic-year";
import type { IPbasApiScore } from "@/models/core/pbas-snapshot-schema";
import type { IPbasDraftReferences } from "@/models/core/pbas-reference-schema";
import FacultyTeachingLoad from "@/models/faculty/faculty-teaching-load";
import FacultyPublication from "@/models/faculty/faculty-publication";
import FacultyResearchProject from "@/models/faculty/faculty-research-project";
import FacultyFdpConducted from "@/models/faculty/faculty-fdp-conducted";
import FacultyAdminRole from "@/models/faculty/faculty-admin-role";
import FacultySocialExtension from "@/models/faculty/faculty-social-extension";
import FacultyTeachingSummary from "@/models/faculty/faculty-teaching-summary";

function normalizeDesignation(value?: string | null) {
    const fallback = designationOptions[0];
    if (!value) return fallback;
    return designationOptions.includes(value as (typeof designationOptions)[number])
        ? (value as (typeof designationOptions)[number])
        : fallback;
}

async function upsertComputedIndicatorEntries(
    application: InstanceType<typeof FacultyPbasForm>,
    scorecard: PbasDynamicScorecard,
    options: {
        revisionId?: Types.ObjectId;
        session?: mongoose.ClientSession;
    } = {}
) {
    const revisionId = options.revisionId;

    await Promise.all(
        scorecard.indicators.map((indicator) => {
            const rawScore =
                scorecard.claimedScores[indicator.formulaKey] ??
                scorecard.claimedScores[indicator.indicatorCode] ??
                0;
            const claimedScore = roundScore(Math.min(Math.max(rawScore, 0), indicator.maxScore));

            return FacultyPbasEntry.updateOne(
                revisionId
                    ? {
                        pbasFormId: application._id,
                        pbasRevisionId: revisionId,
                        indicatorId: indicator._id,
                    }
                    : {
                        pbasFormId: application._id,
                        pbasRevisionId: { $exists: false },
                        indicatorId: indicator._id,
                    },
                revisionId
                    ? {
                        $set: {
                            pbasFormId: application._id,
                            pbasRevisionId: revisionId,
                            indicatorId: indicator._id,
                            facultyId: application.facultyId,
                            academicYearId: application.academicYearId,
                            claimedScore,
                        },
                    }
                    : {
                        $set: {
                            pbasFormId: application._id,
                            indicatorId: indicator._id,
                            facultyId: application.facultyId,
                            academicYearId: application.academicYearId,
                            claimedScore,
                        },
                        $unset: {
                            pbasRevisionId: 1,
                        },
                    },
                { upsert: true, session: options.session }
            );
        })
    );
}

function hasDraftReferenceSelection(references?: Partial<IPbasDraftReferences> | null) {
    return Boolean(
        references?.teachingSummaryId ||
            references?.teachingLoadIds?.length ||
            references?.resultSummaryIds?.length ||
            references?.publicationIds?.length ||
            references?.bookIds?.length ||
            references?.patentIds?.length ||
            references?.researchProjectIds?.length ||
            references?.eventParticipationIds?.length ||
            references?.fdpIds?.length ||
            references?.moocCourseIds?.length ||
            references?.econtentIds?.length ||
            references?.phdGuidanceIds?.length ||
            references?.awardIds?.length ||
            references?.consultancyIds?.length ||
            references?.adminRoleIds?.length ||
            references?.institutionalContributionIds?.length ||
            references?.socialExtensionIds?.length
    );
}

async function resolveDraftState(application: InstanceType<typeof FacultyPbasForm>) {
    const context = await loadPbasReferenceContext(application.facultyId, application.academicYearId);
    const scoringWeights = await getPbasScoringWeightsFromMasterData();
    const automaticReferences = deriveAutoDraftReferences(context);
    const baseReferences = hasDraftReferenceSelection(application.draftReferences)
        ? application.draftReferences
        : automaticReferences;
    const draftReferences = sanitizeDraftReferences(baseReferences, context);
    const snapshot = resolvePbasSnapshotFromReferences(context, draftReferences);
    const selectedContext = selectPbasReferenceContext(context, draftReferences);
    const candidates = serializePbasCandidatePools(context);
    const scorecard = await computePbasDynamicScorecard(snapshot, scoringWeights, selectedContext);

    return {
        context,
        selectedContext,
        candidates,
        draftReferences,
        snapshot,
        scoringWeights,
        apiScore: scorecard.apiScore,
        scorecard,
    };
}

async function getActiveRevision(application: InstanceType<typeof FacultyPbasForm>) {
    const revisionId = application.activeRevisionId || application.latestSubmittedRevisionId;
    if (!revisionId) {
        return null;
    }

    return FacultyPbasRevision.findById(revisionId);
}

async function getRevisionHistory(application: InstanceType<typeof FacultyPbasForm>) {
    return FacultyPbasRevision.find({ pbasFormId: application._id })
        .select("revisionNumber submittedAt approvedAt backfillIntegrity migrationSource apiScore createdFromStatus")
        .sort({ revisionNumber: -1 })
        .lean<IFacultyPbasRevision[]>();
}

function serializeRevision(revision: IFacultyPbasRevision | null) {
    if (!revision) {
        return null;
    }

    return {
        _id: revision._id.toString(),
        revisionNumber: revision.revisionNumber,
        submittedAt: revision.submittedAt,
        approvedAt: revision.approvedAt,
        backfillIntegrity: revision.backfillIntegrity,
        migrationSource: revision.migrationSource,
        createdFromStatus: revision.createdFromStatus,
        apiScore: revision.apiScore,
        snapshot: revision.snapshot,
        draftReferences: serializePbasDraftReferences(revision.references),
    };
}

async function buildApplicationResponse(application: InstanceType<typeof FacultyPbasForm>) {
    const draftState = await resolveDraftState(application);
    const activeRevision = await getActiveRevision(application);
    const revisions = await getRevisionHistory(application);
    const isLockedState = !["Draft", "Rejected"].includes(application.status);

    return {
        ...application.toObject(),
        draftReferences: serializePbasDraftReferences(draftState.draftReferences),
        candidates: draftState.candidates,
        snapshot: isLockedState && activeRevision ? activeRevision.snapshot : draftState.snapshot,
        draftSnapshot: draftState.snapshot,
        activeRevision: serializeRevision(activeRevision),
        revisionHistory: revisions.map((revision) => ({
            _id: revision._id.toString(),
            revisionNumber: revision.revisionNumber,
            submittedAt: revision.submittedAt,
            approvedAt: revision.approvedAt,
            backfillIntegrity: revision.backfillIntegrity,
            migrationSource: revision.migrationSource,
            createdFromStatus: revision.createdFromStatus,
            apiScore: revision.apiScore,
        })),
    };
}

async function cloneDraftEntriesToRevision(
    application: InstanceType<typeof FacultyPbasForm>,
    revisionId: Types.ObjectId,
    session?: mongoose.ClientSession
) {
    const draftEntries = await FacultyPbasEntry.find({
        pbasFormId: application._id,
        pbasRevisionId: { $exists: false },
    }).session(session ?? null);

    await Promise.all(
        draftEntries.map((entry) =>
            FacultyPbasEntry.updateOne(
                { pbasRevisionId: revisionId, indicatorId: entry.indicatorId },
                {
                    $set: {
                        pbasFormId: application._id,
                        pbasRevisionId: revisionId,
                        indicatorId: entry.indicatorId,
                        facultyId: application.facultyId,
                        academicYearId: application.academicYearId,
                        claimedScore: entry.claimedScore,
                        approvedScore: entry.approvedScore,
                        evidenceDocumentId: entry.evidenceDocumentId,
                        remarks: entry.remarks,
                    },
                },
                { upsert: true, session }
            )
        )
    );
}

async function createRevisionFromDraft(
    application: InstanceType<typeof FacultyPbasForm>,
    actor: SafeActor | undefined,
    options: {
        migrationSource?: "runtime_submit" | "legacy_snapshot" | "live_references";
        backfillIntegrity?: "exact" | "reconstructed";
        forcedSnapshot?: PbasSnapshot;
        forcedReferences?: IPbasDraftReferences;
        forcedApiScore?: IPbasApiScore;
        session?: mongoose.ClientSession;
    } = {}
) {
    const draftState = await resolveDraftState(application);
    const revisionCount = await FacultyPbasRevision.countDocuments({ pbasFormId: application._id }).session(options.session ?? null);
    const references = options.forcedReferences ?? draftState.draftReferences;
    const snapshot = options.forcedSnapshot ?? draftState.snapshot;
    const apiScore = options.forcedApiScore ?? draftState.apiScore;

    const revision = new FacultyPbasRevision({
        pbasFormId: application._id,
        revisionNumber: revisionCount + 1,
        createdFromStatus: application.status,
        submittedAt: new Date(),
        submittedBy: actor ? new Types.ObjectId(actor.id) : undefined,
        migrationSource: options.migrationSource,
        backfillIntegrity: options.backfillIntegrity,
        references,
        snapshot,
        apiScore,
    });
    await revision.save({ session: options.session });

    application.activeRevisionId = revision._id;
    application.latestSubmittedRevisionId = revision._id;
    application.apiScore = apiScore;
    await application.save({ session: options.session });

    await upsertComputedIndicatorEntries(application, draftState.scorecard, {
        revisionId: revision._id as Types.ObjectId,
        session: options.session,
    });
    await cloneDraftEntriesToRevision(application, revision._id as Types.ObjectId, options.session);
    await syncPbasTotalEntries(application._id.toString(), revision._id.toString());

    return revision;
}

async function markRevisionApproved(revisionId?: Types.ObjectId | null, actor?: SafeActor, session?: mongoose.ClientSession) {
    if (!revisionId) {
        return;
    }

    await FacultyPbasRevision.updateOne(
        { _id: revisionId },
        {
            $set: {
                approvedAt: new Date(),
                approvedBy: actor ? new Types.ObjectId(actor.id) : undefined,
            },
        },
        { session }
    );

    await FacultyPbasEntry.updateMany(
        { pbasRevisionId: revisionId },
        [
            {
                $set: {
                    approvedScore: { $ifNull: ["$approvedScore", "$claimedScore"] },
                },
            },
        ],
        { session }
    );
}

export async function canReviewPbasApplication(
    application: InstanceType<typeof FacultyPbasForm>,
    actor: SafeActor
) {
    const subjectScope = await applyFacultyWorkflowScope(application, application.facultyId);

    return canActorProcessWorkflowStage({
        actor,
        moduleName: "PBAS",
        recordId: application._id.toString(),
        status: application.status,
        subjectDepartmentName: subjectScope.departmentName,
        subjectCollegeName: subjectScope.collegeName,
        subjectUniversityName: subjectScope.universityName,
        subjectDepartmentId: subjectScope.departmentId,
        subjectInstitutionId: subjectScope.institutionId,
        subjectDepartmentOrganizationId: subjectScope.departmentOrganizationId,
        subjectCollegeOrganizationId: subjectScope.collegeOrganizationId,
        subjectUniversityOrganizationId: subjectScope.universityOrganizationId,
        subjectOrganizationIds: subjectScope.subjectOrganizationIds,
        stageKinds: ["review"],
    });
}

function pushStatusLog(
    application: InstanceType<typeof FacultyPbasForm>,
    status: PbasStatus,
    actor?: SafeActor,
    remarks?: string
) {
    application.statusLogs.push(buildStatusLogEntry(status, actor, remarks));
}

function parseDateInput(value: string) {
    const trimmed = value.trim();
    const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
        ? new Date(`${trimmed}T00:00:00.000Z`)
        : new Date(trimmed);

    return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
}

function assertAppraisalPeriodWithinAcademicYear(input: { academicYear: string; appraisalPeriod: { fromDate: string; toDate: string } }) {
    const parsedYear = parseAcademicYearLabel(input.academicYear);

    if (!parsedYear) {
        throw new AuthError(`Invalid academic year \"${input.academicYear}\".`, 400);
    }

    const fromDate = parseDateInput(input.appraisalPeriod.fromDate);
    const toDate = parseDateInput(input.appraisalPeriod.toDate);

    if (!fromDate || !toDate) {
        throw new AuthError("Appraisal period dates must be valid.", 400);
    }

    if (fromDate > toDate) {
        throw new AuthError("Appraisal end date must be on or after appraisal start date.", 400);
    }

    const fromYear = fromDate.getUTCFullYear();
    const toYear = toDate.getUTCFullYear();

    if (fromYear < parsedYear.start || fromYear > parsedYear.end) {
        throw new AuthError("Appraisal start date must fall within the selected academic year.", 400);
    }

    if (toYear < parsedYear.start || toYear > parsedYear.end) {
        throw new AuthError("Appraisal end date must fall within the selected academic year.", 400);
    }
}

function toAcademicYearLabel(yearStart?: number, yearEnd?: number) {
    return formatAcademicYearLabel(yearStart, yearEnd);
}

async function ensureAcademicYear(value: string) {
    const parsed = parseAcademicYearLabel(value);

    if (!parsed) {
        throw new AuthError(`Invalid academic year \"${value}\".`, 400);
    }

    const academicYear = await AcademicYear.findOne({
        yearStart: parsed.start,
        yearEnd: parsed.end,
    });

    if (!academicYear) {
        throw new AuthError(
            `Academic year \"${value}\" is not configured. Add it in Admin > Academics first.`,
            400
        );
    }

    return academicYear;
}

async function resolveAcademicYearFromInput(input: { academicYearId?: string; academicYear?: string }) {
    const normalizedId = input.academicYearId?.trim();

    if (normalizedId) {
        if (!Types.ObjectId.isValid(normalizedId)) {
            throw new AuthError("Invalid academic year id.", 400);
        }

        const byId = await AcademicYear.findById(normalizedId).select("_id yearStart yearEnd");
        if (!byId) {
            throw new AuthError("Academic year not found.", 404);
        }

        return {
            model: byId,
            label: toAcademicYearLabel(byId.yearStart, byId.yearEnd),
        };
    }

    const normalizedLabel = input.academicYear?.trim();
    if (!normalizedLabel) {
        throw new AuthError("Academic year id or label is required.", 400);
    }

    const byLabel = await ensureAcademicYear(normalizedLabel);

    return {
        model: byLabel,
        label: toAcademicYearLabel(byLabel.yearStart, byLabel.yearEnd),
    };
}

async function upsertWorkflow(
    application: InstanceType<typeof FacultyPbasForm>,
    actor: SafeActor | undefined,
    remarks?: string,
    action?: "submit" | "approve" | "reject",
    session?: mongoose.ClientSession
) {
    const subjectScope = await applyFacultyWorkflowScope(application, application.facultyId);

    await syncWorkflowInstanceState({
        moduleName: "PBAS",
        recordId: application._id.toString(),
        status: application.status,
        subjectDepartmentName: subjectScope.departmentName,
        subjectCollegeName: subjectScope.collegeName,
        subjectUniversityName: subjectScope.universityName,
        subjectDepartmentId: subjectScope.departmentId,
        subjectInstitutionId: subjectScope.institutionId,
        subjectDepartmentOrganizationId: subjectScope.departmentOrganizationId,
        subjectCollegeOrganizationId: subjectScope.collegeOrganizationId,
        subjectUniversityOrganizationId: subjectScope.universityOrganizationId,
        subjectOrganizationIds: subjectScope.subjectOrganizationIds,
        actor,
        remarks,
        action,
        session,
    });
}

async function audit(
    actor: SafeActor | undefined,
    action: string,
    tableName: string,
    recordId?: string,
    oldData?: unknown,
    newData?: unknown,
    session?: mongoose.ClientSession
) {
    await createAuditLog({
        actor,
        action,
        tableName,
        recordId,
        oldData,
        newData,
        auditContext: actor?.auditContext,
        session,
    });
}

const ACTIVE_PBAS_STATUSES: ReadonlyArray<PbasStatus> = [
    "Draft",
    "Rejected",
    "Submitted",
    "Under Review",
    "Committee Review",
];

export type PbasSummary = {
    activeYear?: {
        id: string;
        label: string;
        yearStart: number;
        yearEnd: number;
    };
    academicYearOptions: Array<{
        id: string;
        label: string;
        isActive: boolean;
    }>;
    submissionDeadline?: string;
    lastApprovedApiScore?: number;
    lastApprovedYear?: string;
    warnings: string[];
    stats: {
        teachingLoadHours: number;
        publicationCount: number;
        projectCount: number;
        fdpCount: number;
        adminRoleCount: number;
        extensionCount: number;
        evidenceCount: number;
    };
    meta: {
        academicYear: string;
        currentDesignation: string;
        appraisalPeriod: { fromDate: string; toDate: string };
    };
    snapshot: PbasSnapshot;
    apiScore: IPbasApiScore;
    scoringWeights: PbasScoringWeights;
};

export async function getPbasSummaryForFaculty(actor: SafeActor): Promise<PbasSummary> {
    await dbConnect();
    await ensurePbasDynamicMigration();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can access PBAS summary.", 403);
    }

    const { faculty } = await ensureFacultyContext(actor.id);
    const academicYears = await AcademicYear.find({}).sort({ yearStart: -1 }).lean();
    const activeYear =
        (await AcademicYear.findOne({ isActive: true }).sort({ yearStart: -1 })) ||
        (await AcademicYear.findOne({}).sort({ yearStart: -1 }));
    const activeYearLabel = activeYear
        ? toAcademicYearLabel(activeYear.yearStart, activeYear.yearEnd)
        : "";

    const { rawDeadline } = await getPbasSubmissionDeadline();
    const scoringWeights = await getPbasScoringWeightsFromMasterData();
    const submissionDeadline = rawDeadline || undefined;

    const lastApproved = await FacultyPbasForm.findOne({
        facultyId: faculty._id,
        status: "Approved",
    })
        .sort({ updatedAt: -1 })
        .select("academicYear apiScore");

    const teachingLoads = activeYear
        ? await FacultyTeachingLoad.find({
            facultyId: faculty._id,
            academicYearId: activeYear._id,
        }).sort({ updatedAt: -1 })
        : [];
    const teachingSummary = activeYear
        ? await FacultyTeachingSummary.findOne({
            facultyId: faculty._id,
            academicYearId: activeYear._id,
        })
        : null;
    const publications = await FacultyPublication.find({ facultyId: faculty._id }).sort({
        updatedAt: -1,
    });
    const projects = await FacultyResearchProject.find({ facultyId: faculty._id }).sort({
        updatedAt: -1,
    });
    const fdps = await FacultyFdpConducted.find({ facultyId: faculty._id }).sort({
        updatedAt: -1,
    });
    const adminRoles = await FacultyAdminRole.find({ facultyId: faculty._id }).sort({
        updatedAt: -1,
    });
    const extensions = await FacultySocialExtension.find({ facultyId: faculty._id })
        .populate("programId", "name")
        .sort({
            updatedAt: -1,
        });

    const teachingLoadHours = teachingLoads.reduce((sum, item) => sum + Number(item.totalHours || 0), 0) ||
        teachingSummary?.classesTaken ||
        0;
    const publicationCount = publications.length;
    const projectCount = projects.length;
    const fdpCount = fdps.length;
    const adminRoleCount = adminRoles.length;
    const extensionCount = extensions.length;

    const evidenceCount = activeYear
        ? await FacultyPbasEntry.countDocuments({
            facultyId: faculty._id,
            academicYearId: activeYear._id,
            evidenceDocumentId: { $exists: true, $ne: null },
        })
        : 0;

    const warnings: string[] = [];
    if (!teachingLoadHours) warnings.push("No teaching load captured for the active academic year.");
    if (!publicationCount) warnings.push("No research publications recorded yet.");
    if (!projectCount) warnings.push("No research projects recorded yet.");
    if (!fdpCount) warnings.push("No FDP or workshop participation recorded yet.");
    if (!adminRoleCount) warnings.push("No committee or administrative roles recorded yet.");
    if (!extensionCount) warnings.push("No extension or social outreach entries recorded yet.");
    if (!evidenceCount) warnings.push("No supporting evidence uploaded for PBAS yet.");

    if (!activeYear) {
        throw new AuthError("No academic year is configured. Add at least one in Admin > Academics.", 400);
    }

    const meta = {
        academicYear: activeYearLabel,
        currentDesignation: normalizeDesignation(faculty.designation),
        appraisalPeriod: {
            fromDate: `${activeYear.yearStart}-06-01`,
            toDate: `${activeYear.yearEnd}-05-31`,
        },
    };
    const snapshot = await buildPbasSnapshot(faculty._id, activeYear?._id ?? null);
    const summaryContext = activeYear ? await loadPbasReferenceContext(faculty._id, activeYear._id) : undefined;
    const summaryReferences = summaryContext ? deriveAutoDraftReferences(summaryContext) : emptyPbasDraftReferences();
    const selectedSummaryContext = summaryContext
        ? selectPbasReferenceContext(summaryContext, summaryReferences)
        : undefined;
    const scorecard = await computePbasDynamicScorecard(snapshot, scoringWeights, selectedSummaryContext);

    return {
        activeYear: activeYear
            ? {
                id: activeYear._id.toString(),
                label: activeYearLabel,
                yearStart: activeYear.yearStart,
                yearEnd: activeYear.yearEnd,
            }
            : undefined,
        academicYearOptions: academicYears.map((year) => ({
            id: year._id.toString(),
            label: toAcademicYearLabel(year.yearStart, year.yearEnd),
            isActive: Boolean(year.isActive),
        })),
        submissionDeadline,
        lastApprovedApiScore: lastApproved?.apiScore?.totalScore,
        lastApprovedYear: lastApproved?.academicYear,
        warnings,
        stats: {
            teachingLoadHours,
            publicationCount,
            projectCount,
            fdpCount,
            adminRoleCount,
            extensionCount,
            evidenceCount,
        },
        meta,
        snapshot,
        apiScore: scorecard.apiScore,
        scoringWeights,
    };
}

export async function createPbasApplication(actor: SafeActor, rawInput: unknown) {
    const input = pbasApplicationSchema.parse(rawInput);
    await dbConnect();
    await ensurePbasDynamicMigration();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can create PBAS applications.", 403);
    }

    const { faculty } = await ensureFacultyContext(actor.id);

    const activeApplication = await FacultyPbasForm.findOne({
        facultyId: faculty._id,
        status: { $in: ACTIVE_PBAS_STATUSES },
    }).sort({ updatedAt: -1 });

    if (activeApplication) {
        throw new AuthError(
            `Only one active PBAS form is allowed at a time. Current active form is in ${activeApplication.status} status (${activeApplication.academicYear}).`,
            409
        );
    }

    const resolvedAcademicYear = await resolveAcademicYearFromInput(input);
    const academicYear = resolvedAcademicYear.model;
    assertAppraisalPeriodWithinAcademicYear({
        academicYear: resolvedAcademicYear.label,
        appraisalPeriod: input.appraisalPeriod,
    });
    const context = await loadPbasReferenceContext(faculty._id, academicYear._id);
    const scoringWeights = await getPbasScoringWeightsFromMasterData();
    const draftReferences = deriveAutoDraftReferences(context);
    const snapshot = resolvePbasSnapshotFromReferences(context, draftReferences);
    const selectedContext = selectPbasReferenceContext(context, draftReferences);
    const scorecard = await computePbasDynamicScorecard(snapshot, scoringWeights, selectedContext);
    const apiScore = scorecard.apiScore;

    const existing = await FacultyPbasForm.findOne({
        facultyId: faculty._id,
        academicYearId: academicYear._id,
    });

    if (existing) {
        await upsertWorkflow(existing, actor, "PBAS draft already exists.");
        await audit(actor, "PBAS_CREATE_IDEMPOTENT", "faculty_pbas_forms", existing._id.toString());
        return buildApplicationResponse(existing);
    }

    const application = await FacultyPbasForm.create({
        facultyId: faculty._id,
        academicYearId: academicYear._id,
        academicYear: resolvedAcademicYear.label,
        submissionStatus: "Draft",
        currentDesignation: input.currentDesignation,
        appraisalPeriod: input.appraisalPeriod,
        draftReferences,
        apiScore,
        reviewCommittee: [],
        statusLogs: [
            {
                status: "Draft",
                actorId: new Types.ObjectId(actor.id),
                actorName: actor.name,
                actorRole: actor.role,
                remarks: "PBAS application draft created.",
                changedAt: new Date(),
            },
        ],
        status: "Draft",
    });

    await upsertComputedIndicatorEntries(application, scorecard);
    await syncPbasTotalEntries(application._id.toString());
    await upsertWorkflow(application, actor, "PBAS draft created.");
    await audit(actor, "PBAS_CREATE", "faculty_pbas_forms", application._id.toString(), undefined, {
        facultyId: application.facultyId,
        academicYearId: application.academicYearId,
        academicYear: application.academicYear,
        status: application.status,
    });

    return buildApplicationResponse(application);
}

export async function getFacultyPbasApplications(actor: SafeActor) {
    await dbConnect();
    await ensurePbasDynamicMigration();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can view their PBAS applications.", 403);
    }

    const { faculty } = await ensureFacultyContext(actor.id);

    return FacultyPbasForm.find({ facultyId: faculty._id }).sort({ updatedAt: -1 });
}

export async function getPbasApplicationDetails(actor: SafeActor, id: string) {
    const application = await getPbasApplicationById(actor, id);
    return buildApplicationResponse(application);
}

export async function getPbasSnapshotForApplication(application: InstanceType<typeof FacultyPbasForm>) {
    const activeRevision = await getActiveRevision(application);
    if (activeRevision && !["Draft", "Rejected"].includes(application.status)) {
        return activeRevision.snapshot;
    }

    const draftState = await resolveDraftState(application);
    return draftState.snapshot;
}

export async function getPbasApplicationById(actor: SafeActor, id: string) {
    await dbConnect();
    await ensurePbasDynamicMigration();
    let application = await FacultyPbasForm.findById(id);

    if (!application) {
        const canonical = await resolveCanonicalPbasId(id);
        if (canonical) {
            application = await FacultyPbasForm.findById(canonical);
        }
    }

    if (!application) {
        throw new AuthError("PBAS application not found.", 404);
    }

    if (actor.role === "Admin") {
        return application;
    }

    if (actor.role === "Faculty") {
        const { faculty } = await ensureFacultyContext(actor.id);

        if (application.facultyId.toString() === faculty._id.toString()) {
            return application;
        }
    }

    const subjectScope = await applyFacultyWorkflowScope(application, application.facultyId);
    const profile = await resolveAuthorizationProfile(actor);

    if (canViewModuleRecord(profile, "PBAS", subjectScope)) {
        return application;
    }

    throw new AuthError("You do not have access to this PBAS application.", 403);
}

export async function updatePbasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = pbasApplicationSchema.parse(rawInput);
    const application = await getPbasApplicationById(actor, id);
    const facultyContext = actor.role === "Faculty" ? await ensureFacultyContext(actor.id) : null;

    if (
        actor.role !== "Faculty" ||
        application.facultyId.toString() !== facultyContext?.faculty._id.toString()
    ) {
        throw new AuthError("Only the faculty owner can update this PBAS application.", 403);
    }

    if (!["Draft", "Rejected"].includes(application.status)) {
        throw new AuthError("Only draft or rejected PBAS applications can be edited.", 409);
    }

    const oldState = application.toObject();
    const resolvedAcademicYear = await resolveAcademicYearFromInput(input);
    const academicYear = resolvedAcademicYear.model;
    assertAppraisalPeriodWithinAcademicYear({
        academicYear: resolvedAcademicYear.label,
        appraisalPeriod: input.appraisalPeriod,
    });
    const academicYearChanged = application.academicYearId.toString() !== academicYear._id.toString();
    const context = await loadPbasReferenceContext(application.facultyId, academicYear._id);
    const nextDraftReferences = academicYearChanged
        ? deriveAutoDraftReferences(context)
        : sanitizeDraftReferences(
            hasDraftReferenceSelection(application.draftReferences)
                ? application.draftReferences
                : deriveAutoDraftReferences(context),
            context
        );
    const snapshot = resolvePbasSnapshotFromReferences(context, nextDraftReferences);
    const scoringWeights = await getPbasScoringWeightsFromMasterData();
    const selectedContext = selectPbasReferenceContext(context, nextDraftReferences);
    const scorecard = await computePbasDynamicScorecard(snapshot, scoringWeights, selectedContext);
    application.academicYearId = academicYear._id;
    application.academicYear = resolvedAcademicYear.label;
    application.currentDesignation = input.currentDesignation;
    application.appraisalPeriod = input.appraisalPeriod;
    application.draftReferences = nextDraftReferences;
    application.apiScore = scorecard.apiScore;
    application.submissionStatus = ["Draft", "Rejected"].includes(application.status) ? "Draft" : "Submitted";

    await application.save();
    await upsertComputedIndicatorEntries(application, scorecard);
    await syncPbasTotalEntries(application._id.toString());
    await upsertWorkflow(application, actor, "PBAS draft updated.");
    await audit(actor, "PBAS_UPDATE", "faculty_pbas_forms", application._id.toString(), oldState, application.toObject());

    return buildApplicationResponse(application);
}

export async function updatePbasDraftReferences(actor: SafeActor, id: string, rawInput: unknown) {
    const application = await getPbasApplicationById(actor, id);
    const facultyContext = actor.role === "Faculty" ? await ensureFacultyContext(actor.id) : null;

    if (
        actor.role !== "Faculty" ||
        application.facultyId.toString() !== facultyContext?.faculty._id.toString()
    ) {
        throw new AuthError("Only the faculty owner can update PBAS draft references.", 403);
    }

    if (!["Draft", "Rejected"].includes(application.status)) {
        throw new AuthError("PBAS references can only be updated in Draft or Rejected status.", 409);
    }

    const parsed = parsePbasDraftReferences(rawInput as PbasDraftReferencesInput);
    const context = await loadPbasReferenceContext(application.facultyId, application.academicYearId);
    const safeReferences = sanitizeDraftReferences(parsed, context);
    const snapshot = resolvePbasSnapshotFromReferences(context, safeReferences);
    const scoringWeights = await getPbasScoringWeightsFromMasterData();
    const selectedContext = selectPbasReferenceContext(context, safeReferences);
    const scorecard = await computePbasDynamicScorecard(snapshot, scoringWeights, selectedContext);

    application.draftReferences = safeReferences;
    application.apiScore = scorecard.apiScore;
    await application.save();
    await upsertComputedIndicatorEntries(application, scorecard);
    await syncPbasTotalEntries(application._id.toString());

    return buildApplicationResponse(application);
}

export async function deletePbasApplication(actor: SafeActor, id: string) {
    await dbConnect();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only the faculty owner can delete this PBAS application.", 403);
    }

    const { faculty } = await ensureFacultyContext(actor.id);
    const application = await FacultyPbasForm.findOne({ _id: id, facultyId: faculty._id });

    if (!application) {
        throw new AuthError("PBAS application not found.", 404);
    }

    if (application.status !== "Draft") {
        throw new AuthError("Only draft PBAS applications can be deleted.", 409);
    }

    const session = await mongoose.startSession();
    let deletedRevisions = 0;
    let deletedEntries = 0;

    try {
        await session.withTransaction(async () => {
            const entryDeleteResult = await FacultyPbasEntry.deleteMany({ pbasFormId: application._id }, { session });
            deletedEntries = entryDeleteResult.deletedCount ?? 0;

            const revisionDeleteResult = await FacultyPbasRevision.deleteMany({ pbasFormId: application._id }, { session });
            deletedRevisions = revisionDeleteResult.deletedCount ?? 0;

            await WorkflowInstance.deleteOne(
                { moduleName: "PBAS", recordId: application._id.toString() },
                { session }
            );

            await FacultyPbasForm.deleteOne({ _id: application._id }, { session });
        });
    } finally {
        await session.endSession();
    }

    await audit(actor, "PBAS_DELETE", "faculty_pbas_forms", application._id.toString(), {
        status: application.status,
    }, {
        deletedEntries,
        deletedRevisions,
    });

    return application;
}

export async function submitPbasApplication(actor: SafeActor, id: string) {
    const application = await getPbasApplicationById(actor, id);
    const facultyContext = actor.role === "Faculty" ? await ensureFacultyContext(actor.id) : null;
    const workflowDefinition = await getActiveWorkflowDefinition("PBAS");

    if (
        actor.role !== "Faculty" ||
        application.facultyId.toString() !== facultyContext?.faculty._id.toString()
    ) {
        throw new AuthError("Only the faculty owner can submit this PBAS application.", 403);
    }

    let submitTransition;
    try {
        submitTransition = resolveWorkflowTransition(workflowDefinition, application.status, "submit");
    } catch (error) {
        throw new AuthError(
            error instanceof Error
                ? error.message
                : "Only draft or rejected applications can be submitted.",
            409
        );
    }

    const { parsedDeadline, rawDeadline } = await getPbasSubmissionDeadline();
    if (parsedDeadline && new Date() > parsedDeadline) {
        throw new AuthError(
            `PBAS submission deadline (${rawDeadline}) has passed. Contact admin to reopen submission.`,
            400
        );
    }

    const draftState = await resolveDraftState(application);
    application.draftReferences = draftState.draftReferences;
    application.apiScore = draftState.apiScore;

    if (application.apiScore.totalScore <= 0) {
        throw new AuthError("PBAS application must contain academic activity before submission.", 400);
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const txApplication = await FacultyPbasForm.findById(application._id).session(session);
            if (!txApplication) {
                throw new AuthError("PBAS application not found.", 404);
            }

            txApplication.draftReferences = draftState.draftReferences;
            txApplication.apiScore = draftState.apiScore;
            await txApplication.save({ session });
            await upsertComputedIndicatorEntries(txApplication, draftState.scorecard, { session });

            await createRevisionFromDraft(txApplication, actor, {
                migrationSource: "runtime_submit",
                forcedSnapshot: draftState.snapshot,
                forcedReferences: draftState.draftReferences,
                forcedApiScore: draftState.apiScore,
                session,
            });

            txApplication.status = submitTransition.status as PbasStatus;
            txApplication.submissionStatus = "Submitted";
            txApplication.submittedAt = new Date();
            pushStatusLog(
                txApplication,
                submitTransition.status as PbasStatus,
                actor,
                "Faculty submitted PBAS application."
            );
            await txApplication.save({ session });
            await upsertWorkflow(txApplication, actor, "PBAS submitted.", "submit", session);
            await audit(actor, "PBAS_SUBMIT", "faculty_pbas_forms", txApplication._id.toString(), undefined, undefined, session);
        });
    } finally {
        await session.endSession();
    }

    await syncPbasTotalEntries(application._id.toString());
    const refreshed = await FacultyPbasForm.findById(application._id);
    if (!refreshed) {
        throw new AuthError("PBAS application not found after submit.", 404);
    }

    await notifyPbasStageAssignment(refreshed, submitTransition.stage, actor);

    return buildApplicationResponse(refreshed);
}

export async function reviewPbasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = pbasReviewSchema.parse(rawInput);
    const application = await getPbasApplicationById(actor, id);
    const workflowDefinition = await getActiveWorkflowDefinition("PBAS");
    const isOverride = canUseBreakGlassOverride(actor, "PBAS") && Boolean(input.overrideReason?.trim());

    const canReview = await canReviewPbasApplication(application, actor);

    if (!canReview && !isOverride) {
        throw new AuthError("You are not authorized to review this PBAS application.", 403);
    }

    let reviewTransition;
    try {
        reviewTransition = resolveWorkflowTransition(
            workflowDefinition,
            application.status,
            input.decision === "Reject" ? "reject" : "approve"
        );
    } catch (error) {
        throw new AuthError(
            error instanceof Error ? error.message : "Invalid PBAS review transition.",
            409
        );
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const txApplication = await FacultyPbasForm.findById(application._id).session(session);
            if (!txApplication) {
                throw new AuthError("PBAS application not found.", 404);
            }

            const currentStage = getWorkflowStageByStatus(workflowDefinition, txApplication.status);

            if (!currentStage || currentStage.kind !== "review") {
                throw new AuthError("PBAS review is only allowed while a review stage is pending.", 409);
            }

            let nextStatus: PbasStatus;
            try {
                nextStatus = resolveWorkflowTransition(
                    workflowDefinition,
                    txApplication.status,
                    input.decision === "Reject" ? "reject" : "approve"
                ).status as PbasStatus;
            } catch (error) {
                throw new AuthError(
                    error instanceof Error ? error.message : "Invalid PBAS review transition.",
                    409
                );
            }

            if (nextStatus === "Rejected") {
                txApplication.status = nextStatus;
                txApplication.submissionStatus = "Draft";
                txApplication.reviewCommittee.push({
                    reviewerId: new Types.ObjectId(actor.id),
                    reviewerName: actor.name,
                    reviewerRole: actor.role,
                    designation:
                        currentStage.key === "department_head_review"
                            ? "Department Head"
                            : "PBAS Committee Reviewer",
                    remarks: input.remarks,
                    decision: input.decision,
                    stage:
                        currentStage.key === "department_head_review"
                            ? "Department Head"
                            : "PBAS Committee",
                    reviewedAt: new Date(),
                });
                pushStatusLog(txApplication, "Rejected", actor, input.remarks);
                await txApplication.save({ session });
                await upsertWorkflow(txApplication, actor, input.remarks, "reject", session);
                await audit(
                    actor,
                    isOverride ? "PBAS_REVIEW_REJECT_OVERRIDE" : "PBAS_REVIEW_REJECT",
                    "faculty_pbas_forms",
                    txApplication._id.toString(),
                    undefined,
                    {
                        status: txApplication.status,
                        remarks: input.remarks,
                        overrideReason: input.overrideReason,
                    },
                    session
                );
                return;
            }

            txApplication.status = nextStatus;
            txApplication.reviewCommittee.push({
                reviewerId: new Types.ObjectId(actor.id),
                reviewerName: actor.name,
                reviewerRole: actor.role,
                designation:
                    currentStage.key === "department_head_review"
                        ? "Department Head Reviewer"
                        : "PBAS Committee Reviewer",
                remarks: input.remarks,
                decision: input.decision,
                stage:
                    currentStage.key === "department_head_review"
                        ? "Department Head"
                        : "PBAS Committee",
                reviewedAt: new Date(),
            });
            pushStatusLog(txApplication, nextStatus, actor, input.remarks);
            await txApplication.save({ session });
            await upsertWorkflow(txApplication, actor, input.remarks, "approve", session);
            await audit(
                actor,
                isOverride ? "PBAS_REVIEW_OVERRIDE" : "PBAS_REVIEW",
                "faculty_pbas_forms",
                txApplication._id.toString(),
                undefined,
                {
                    status: txApplication.status,
                    remarks: input.remarks,
                    overrideReason: input.overrideReason,
                },
                session
            );
        });
    } finally {
        await session.endSession();
    }

    const refreshed = await FacultyPbasForm.findById(application._id);
    if (!refreshed) {
        throw new AuthError("PBAS application not found after review.", 404);
    }

    if (input.decision === "Reject") {
        await notifyPbasFacultyOutcome(refreshed, actor, "Reject");
    } else {
        await notifyPbasStageAssignment(refreshed, reviewTransition.stage, actor);
    }

    return buildApplicationResponse(refreshed);
}

export async function approvePbasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = pbasApprovalSchema.parse(rawInput);
    const workflowDefinition = await getActiveWorkflowDefinition("PBAS");

    const application = await getPbasApplicationById(actor, id);
    const subjectScope = await applyFacultyWorkflowScope(application, application.facultyId);
    const isOverride = canUseBreakGlassOverride(actor, "PBAS") && Boolean(input.overrideReason?.trim());
    const canFinalize = await canActorProcessWorkflowStage({
        actor,
        moduleName: "PBAS",
        recordId: application._id.toString(),
        status: application.status,
        subjectDepartmentName: subjectScope.departmentName,
        subjectCollegeName: subjectScope.collegeName,
        subjectUniversityName: subjectScope.universityName,
        subjectDepartmentId: subjectScope.departmentId,
        subjectInstitutionId: subjectScope.institutionId,
        subjectDepartmentOrganizationId: subjectScope.departmentOrganizationId,
        subjectCollegeOrganizationId: subjectScope.collegeOrganizationId,
        subjectUniversityOrganizationId: subjectScope.universityOrganizationId,
        subjectOrganizationIds: subjectScope.subjectOrganizationIds,
        stageKinds: ["final"],
    });

    if (!canFinalize && !isOverride) {
        throw new AuthError("Only final-stage PBAS applications can be finalized.", 409);
    }

    const finalStatus: PbasStatus = input.decision === "Approve" ? "Approved" : "Rejected";

    try {
        const transition = resolveWorkflowTransition(
            workflowDefinition,
            application.status,
            input.decision === "Approve" ? "approve" : "reject"
        );
        if (transition.status !== finalStatus) {
            throw new Error("PBAS final approval cannot be applied from the current workflow stage.");
        }
    } catch (error) {
        throw new AuthError(
            error instanceof Error ? error.message : "Invalid PBAS final approval transition.",
            409
        );
    }

    const session = await mongoose.startSession();
    let revisionIdForTotals: string | undefined;
    try {
        await session.withTransaction(async () => {
            const txApplication = await FacultyPbasForm.findById(application._id).session(session);
            if (!txApplication) {
                throw new AuthError("PBAS application not found.", 404);
            }

            try {
                const transition = resolveWorkflowTransition(
                    workflowDefinition,
                    txApplication.status,
                    input.decision === "Approve" ? "approve" : "reject"
                );
                if (transition.status !== finalStatus) {
                    throw new Error("PBAS final approval cannot be applied from the current workflow stage.");
                }
            } catch (error) {
                throw new AuthError(
                    error instanceof Error ? error.message : "Invalid PBAS final approval transition.",
                    409
                );
            }

            txApplication.status = finalStatus;
            txApplication.submissionStatus = input.decision === "Approve" ? "Locked" : "Draft";
            txApplication.verifiedBy = new Types.ObjectId(actor.id);
            txApplication.verifiedAt = new Date();
            txApplication.remarks = input.remarks;
            txApplication.reviewCommittee.push({
                reviewerId: new Types.ObjectId(actor.id),
                reviewerName: actor.name,
                reviewerRole: actor.role,
                designation: actor.role === "Admin" ? "Admin Final Approver" : "Principal Final Approver",
                remarks: input.remarks,
                decision: input.decision,
                stage: actor.role === "Admin" ? "Admin" : "Principal",
                reviewedAt: new Date(),
            });
            pushStatusLog(txApplication, txApplication.status, actor, input.remarks);
            await txApplication.save({ session });
            if (input.decision === "Approve") {
                await markRevisionApproved(txApplication.activeRevisionId, actor, session);
            }
            revisionIdForTotals = txApplication.activeRevisionId?.toString();
            await upsertWorkflow(
                txApplication,
                actor,
                input.remarks,
                input.decision === "Approve" ? "approve" : "reject",
                session
            );
            await audit(
                actor,
                isOverride ? "PBAS_APPROVE_OVERRIDE" : "PBAS_APPROVE",
                "faculty_pbas_forms",
                txApplication._id.toString(),
                undefined,
                {
                    status: txApplication.status,
                    decision: input.decision,
                    remarks: input.remarks,
                    overrideReason: input.overrideReason,
                },
                session
            );
        });
    } finally {
        await session.endSession();
    }

    await syncPbasTotalEntries(
        application._id.toString(),
        revisionIdForTotals
    );

    const refreshed = await FacultyPbasForm.findById(application._id);
    if (!refreshed) {
        throw new AuthError("PBAS application not found after approval.", 404);
    }

    await notifyPbasFacultyOutcome(refreshed, actor, input.decision);

    return buildApplicationResponse(refreshed);
}

export async function getPbasReviewQueue(
    actor: SafeActor,
    options?: { stageKinds?: Array<"review" | "final"> }
) {
    await dbConnect();
    await ensurePbasDynamicMigration();
    const workflowDefinition = await getActiveWorkflowDefinition("PBAS");
    const applications = await FacultyPbasForm.find({
        status: {
            $in: getWorkflowPendingStatuses(workflowDefinition) as PbasStatus[],
        },
    }).sort({ updatedAt: -1 });

    await Promise.all(
        applications.map((application) =>
            upsertWorkflow(application as InstanceType<typeof FacultyPbasForm>, undefined)
        )
    );

    const recordIds = await listPendingWorkflowRecordIds({
        actor,
        moduleName: "PBAS",
        stageKinds: options?.stageKinds,
    });
    const recordIdSet = new Set(recordIds);

    return applications.filter((application) => recordIdSet.has(application._id.toString()));
}

export async function getPbasScopedApplications(actor: SafeActor) {
    await dbConnect();
    await ensurePbasDynamicMigration();
    const profile = await resolveAuthorizationProfile(actor);

    if (!profile.hasLeadershipPortalAccess) {
        return [];
    }

    const applications = await FacultyPbasForm.find(buildAuthorizedScopeQuery(profile)).sort({ updatedAt: -1 });

    await Promise.all(
        applications.map((application) => upsertWorkflow(application, undefined))
    );

    const [reviewIds, finalIds] = await Promise.all([
        listPendingWorkflowRecordIds({
            actor,
            moduleName: "PBAS",
            stageKinds: ["review"],
        }),
        listPendingWorkflowRecordIds({
            actor,
            moduleName: "PBAS",
            stageKinds: ["final"],
        }),
    ]);

    const reviewIdSet = new Set(reviewIds);
    const finalIdSet = new Set(finalIds);

    return applications.map((application) => ({
        ...JSON.parse(JSON.stringify(application)),
        permissions: {
            canReview: reviewIdSet.has(application._id.toString()),
            canApprove: finalIdSet.has(application._id.toString()),
            canReject: reviewIdSet.has(application._id.toString()) || finalIdSet.has(application._id.toString()),
            canOverride: profile.isAdmin,
        },
    }));
}

export async function getPbasReportsForCas(facultyId: string) {
    await dbConnect();
    await ensurePbasDynamicMigration();

    const reports = await FacultyPbasForm.find({
        facultyId: new Types.ObjectId(facultyId),
        status: { $in: ["Committee Review", "Approved"] },
    })
        .populate("activeRevisionId", "apiScore revisionNumber")
        .select("academicYear apiScore status activeRevisionId")
        .sort({ academicYear: -1, updatedAt: -1 });

    return reports.map((report) => ({
        ...report.toObject(),
        apiScore:
            (report.activeRevisionId as { apiScore?: typeof report.apiScore } | null)?.apiScore ||
            report.apiScore,
        usableForSubmit: report.status === "Approved",
    }));
}

export async function getPbasReportsByIdsForFaculty(facultyId: string, ids: string[]) {
    await dbConnect();
    await ensurePbasDynamicMigration();

    if (!ids.length) {
        return [];
    }

    const reports = await FacultyPbasForm.find({
        _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
        facultyId: new Types.ObjectId(facultyId),
        status: { $in: ["Committee Review", "Approved"] },
    })
        .populate("activeRevisionId", "apiScore revisionNumber")
        .select("apiScore academicYear status activeRevisionId");

    return reports.map((report) => ({
        ...report.toObject(),
        apiScore:
            (report.activeRevisionId as { apiScore?: typeof report.apiScore } | null)?.apiScore ||
            report.apiScore,
    }));
}
