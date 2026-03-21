import mongoose, { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import { ensureFacultyContext } from "@/lib/faculty/migration";
import { designationOptions } from "@/lib/faculty/options";
import Organization from "@/models/core/organization";
import Department from "@/models/reference/department";
import Faculty from "@/models/faculty/faculty";
import User from "@/models/core/user";
import FacultyPbasForm, { type PbasStatus } from "@/models/core/faculty-pbas-form";
import FacultyPbasRevision, { type IFacultyPbasRevision } from "@/models/core/faculty-pbas-revision";
import {
    pbasApplicationSchema,
    pbasApprovalSchema,
    pbasEntryModerationSchema,
    pbasReviewSchema,
    pbasScoringWeightsSchema,
    type PbasDraftReferencesInput,
    type PbasScoringWeights,
    type PbasSnapshot,
} from "@/lib/pbas/validators";
import { ensurePbasDynamicMigration, resolveCanonicalPbasId, syncPbasTotalEntries } from "@/lib/pbas/migration";
import AcademicYear from "@/models/reference/academic-year";
import ApprovalWorkflow from "@/models/core/approval-workflow";
import AuditLog from "@/models/core/audit-log";
import DocumentModel from "@/models/reference/document";
import type { IPbasDraftReferences } from "@/models/core/pbas-reference-schema";
import FacultyTeachingLoad from "@/models/faculty/faculty-teaching-load";
import FacultyPublication from "@/models/faculty/faculty-publication";
import FacultyResearchProject from "@/models/faculty/faculty-research-project";
import FacultyFdpConducted from "@/models/faculty/faculty-fdp-conducted";
import FacultyAdminRole from "@/models/faculty/faculty-admin-role";
import FacultySocialExtension from "@/models/faculty/faculty-social-extension";
import FacultyTeachingSummary from "@/models/faculty/faculty-teaching-summary";
import MasterData from "@/models/core/master-data";
import FacultyPbasEntry from "@/models/core/faculty-pbas-entry";
import PbasIndicatorMaster from "@/models/core/pbas-indicator-master";
import {
    deriveAutoDraftReferences,
    emptyPbasDraftReferences,
    loadPbasReferenceContext,
    type PbasReferenceContext,
    parsePbasDraftReferences,
    resolvePbasSnapshotFromReferences,
    sanitizeDraftReferences,
    serializePbasCandidatePools,
    serializePbasDraftReferences,
} from "@/lib/pbas/references";
import { assertPbasTransition, deriveReviewTransition } from "@/lib/pbas/workflow";

type SafeActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
};

function normalizeDesignation(value?: string | null) {
    const fallback = designationOptions[0];
    if (!value) return fallback;
    return designationOptions.includes(value as (typeof designationOptions)[number])
        ? (value as (typeof designationOptions)[number])
        : fallback;
}

export const DEFAULT_PBAS_SCORING_WEIGHTS: PbasScoringWeights = {
    caps: {
        teachingActivities: 100,
        researchAcademicContribution: 120,
        institutionalResponsibilities: 80,
    },
    category1: {
        classesTaken: 2,
        coursePreparationHours: 0.4,
        coursesTaught: 4,
        mentoringCount: 3,
        labSupervisionCount: 3,
    },
    category2: {
        researchPaperHigh: 15,
        researchPaperMedium: 10,
        researchPaperDefault: 6,
        book: 18,
        patentGranted: 20,
        patentPublished: 12,
        patentDefault: 8,
        conferenceInternational: 8,
        conferenceNational: 5,
        conferenceDefault: 3,
        projectLargeAmount: 1000000,
        projectMediumAmount: 250000,
        projectLarge: 15,
        projectMedium: 10,
        projectDefault: 6,
    },
    category3: {
        committee: 4,
        administrativeDuty: 5,
        examDuty: 3,
        studentGuidancePerUnit: 1,
        studentGuidanceMaxPerEntry: 10,
        extensionActivity: 4,
    },
    phase2: {
        innovativePedagogyPoints: 5,
        curriculumDevPerCourse: 2,
        econtentDevelopmentPerItem: 2,
        studentFeedbackDivisor: 10,
        assessmentInnovationPerHighOutcome: 2,
        researchGuidanceCompleted: 10,
        researchGuidanceOngoing: 5,
        consultancyPerProject: 5,
        researchEcontentPerItem: 3,
        moocCompletionPerCourse: 2,
        awardsInternational: 4,
        awardsNational: 3,
        awardsState: 2,
        awardsCollege: 1,
        researchImpactHigh: 3,
        researchImpactMedium: 2,
        researchImpactLow: 1,
        editorialReviewPerRole: 2,
        fdpPerItem: 3,
        professionalBodyPerMembership: 2,
        communityServicePerActivity: 2,
        outreachPerActivity: 2,
        resourcePersonPerEvent: 2,
        governancePerRole: 2,
    },
};

function scoreResearchPaper(indexing: string | undefined, weights: PbasScoringWeights) {
    const value = (indexing ?? "").toLowerCase();

    if (value.includes("scopus") || value.includes("ugc care") || value.includes("web of science")) {
        return weights.category2.researchPaperHigh;
    }

    if (value.includes("peer") || value.includes("issn")) {
        return weights.category2.researchPaperMedium;
    }

    return weights.category2.researchPaperDefault;
}

function scorePatent(status: string | undefined, weights: PbasScoringWeights) {
    const value = (status ?? "").toLowerCase();

    if (value.includes("granted")) {
        return weights.category2.patentGranted;
    }

    if (value.includes("published")) {
        return weights.category2.patentPublished;
    }

    return weights.category2.patentDefault;
}

function scoreConference(type: string | undefined, weights: PbasScoringWeights) {
    const value = (type ?? "").toLowerCase();

    if (value.includes("international")) {
        return weights.category2.conferenceInternational;
    }

    if (value.includes("national")) {
        return weights.category2.conferenceNational;
    }

    return weights.category2.conferenceDefault;
}

function scoreProject(amount: number, weights: PbasScoringWeights) {
    if (amount >= weights.category2.projectLargeAmount) {
        return weights.category2.projectLarge;
    }

    if (amount >= weights.category2.projectMediumAmount) {
        return weights.category2.projectMedium;
    }

    return weights.category2.projectDefault;
}

function roundScore(value: number) {
    return Math.round(value * 100) / 100;
}

function buildIndicatorClaimedScores(
    snapshot: PbasSnapshot,
    apiScore: ReturnType<typeof computePbasApiScore>,
    weights: PbasScoringWeights,
    context?: PbasReferenceContext
) {
    const a1TeachingLoad = snapshot.category1.classesTaken * weights.category1.classesTaken;
    const a2CoursePrep = snapshot.category1.coursePreparationHours * weights.category1.coursePreparationHours;
    const a3Mentoring = snapshot.category1.mentoringCount * weights.category1.mentoringCount;
    const a4Lab = snapshot.category1.labSupervisionCount * weights.category1.labSupervisionCount;

    const b1ResearchPapers = snapshot.category2.researchPapers.reduce(
        (sum, paper) => sum + scoreResearchPaper(paper.indexing, weights),
        0
    );
    const b2Books = snapshot.category2.books.length * weights.category2.book;
    const b3Patents = snapshot.category2.patents.reduce(
        (sum, patent) => sum + scorePatent(patent.status, weights),
        0
    );
    const b4Conferences = snapshot.category2.conferences.reduce(
        (sum, conference) => sum + scoreConference(conference.type, weights),
        0
    );
    const b5Projects = snapshot.category2.projects.reduce(
        (sum, project) => sum + scoreProject(project.amount, weights),
        0
    );

    const c1AdminRoles =
        snapshot.category3.committees.length * weights.category3.committee +
        snapshot.category3.administrativeDuties.length * weights.category3.administrativeDuty;
    const c2Exam = snapshot.category3.examDuties.length * weights.category3.examDuty;
    const c3Guidance = snapshot.category3.studentGuidance.reduce(
        (sum, entry) =>
            sum +
            Math.min(
                entry.count * weights.category3.studentGuidancePerUnit,
                weights.category3.studentGuidanceMaxPerEntry
            ),
        0
    );
    const c4Extension = snapshot.category3.extensionActivities.length * weights.category3.extensionActivity;
    const avgResultPercentage = context?.resultSummaries?.length
        ? context.resultSummaries.reduce(
            (sum, item) => sum + Number(item.passPercentage ?? item.resultPercentage ?? 0),
            0
        ) /
            context.resultSummaries.length
        : 0;
    const highOutcomeCount =
        context?.resultSummaries?.filter((item) => Number(item.universityRankStudents || 0) > 0).length ?? 0;
    const innovationSignal = Number(Boolean(snapshot.category1.feedbackSummary?.trim()));
    const authoredCurriculaSignal = snapshot.category1.coursesTaught.length;

    const b6ResearchGuidance = (context?.phdGuidance ?? []).reduce((sum, item) => {
        if (item.status === "completed") {
            return sum + weights.phase2.researchGuidanceCompleted;
        }
        return sum + weights.phase2.researchGuidanceOngoing;
    }, 0);
    const b7Consultancy = (context?.consultancies?.length ?? 0) * weights.phase2.consultancyPerProject;
    const b8Econtent = (context?.econtentItems?.length ?? 0) * weights.phase2.researchEcontentPerItem;
    const b9Mooc = (context?.moocCourses?.length ?? 0) * weights.phase2.moocCompletionPerCourse;
    const b10Awards = (context?.awards ?? []).reduce((sum, item) => {
        if (item.awardLevel === "International") return sum + weights.phase2.awardsInternational;
        if (item.awardLevel === "National") return sum + weights.phase2.awardsNational;
        if (item.awardLevel === "State") return sum + weights.phase2.awardsState;
        return sum + weights.phase2.awardsCollege;
    }, 0);
    const b11ResearchImpact = (context?.publications ?? []).reduce((sum, item) => {
        const impactFactor = Number(item.impactFactor ?? 0);
        if (impactFactor >= 5) return sum + weights.phase2.researchImpactHigh;
        if (impactFactor >= 2) return sum + weights.phase2.researchImpactMedium;
        if (impactFactor > 0) return sum + weights.phase2.researchImpactLow;
        return sum;
    }, 0);
    const b12EditorialReview =
        (context?.eventParticipations?.filter((item) => item.role === "Chair" || item.role === "ResourcePerson")
            .length ?? 0) * weights.phase2.editorialReviewPerRole;

    const c5Fdp = (context?.fdps?.length ?? 0) * weights.phase2.fdpPerItem;
    const c6ProfessionalBody = (context?.institutionalContributions ?? []).filter((item) => {
        const role = (item.role ?? "").toLowerCase();
        const title = (item.activityTitle ?? "").toLowerCase();
        return role.includes("membership") || role.includes("professional") || title.includes("professional");
    }).length * weights.phase2.professionalBodyPerMembership;
    const c7CommunityService = (context?.socialExtensions?.length ?? 0) * weights.phase2.communityServicePerActivity;
    const c8Outreach = (context?.socialExtensions?.length ?? 0) * weights.phase2.outreachPerActivity;
    const c9ResourcePerson =
        (context?.eventParticipations?.filter((item) => item.role === "ResourcePerson").length ?? 0) * weights.phase2.resourcePersonPerEvent;
    const c10Governance = (context?.adminRoles ?? []).filter((item) => {
        const role = (item.roleName ?? "").toLowerCase();
        return (
            role.includes("head") ||
            role.includes("dean") ||
            role.includes("coordinator") ||
            role.includes("chair") ||
            role.includes("governance") ||
            role.includes("iqac")
        );
    }).length * weights.phase2.governancePerRole;

    return {
        A1_TEACHING_LOAD: roundScore(a1TeachingLoad),
        A2_COURSE_PREP: roundScore(a2CoursePrep),
        A3_MENTORING: roundScore(a3Mentoring),
        A4_LAB_SUPERVISION: roundScore(a4Lab),
        A5_INNOVATIVE_PEDAGOGY: roundScore(innovationSignal * weights.phase2.innovativePedagogyPoints),
        A6_CURRICULUM_DEV: roundScore(authoredCurriculaSignal * weights.phase2.curriculumDevPerCourse),
        A7_ECONTENT_DEVELOPMENT: roundScore(
            (context?.econtentItems?.length ?? 0) * weights.phase2.econtentDevelopmentPerItem
        ),
        A8_STUDENT_FEEDBACK: roundScore(avgResultPercentage / weights.phase2.studentFeedbackDivisor),
        A9_ASSESSMENT_INNOVATION: roundScore(
            highOutcomeCount * weights.phase2.assessmentInnovationPerHighOutcome
        ),
        B1_RESEARCH_PAPERS: roundScore(b1ResearchPapers),
        B2_BOOKS_CHAPTERS: roundScore(b2Books),
        B3_PATENTS: roundScore(b3Patents),
        B4_CONFERENCES: roundScore(b4Conferences),
        B5_PROJECTS: roundScore(b5Projects),
        B6_RESEARCH_GUIDANCE: roundScore(b6ResearchGuidance),
        B7_CONSULTANCY: roundScore(b7Consultancy),
        B8_ECONTENT: roundScore(b8Econtent),
        B9_MOOC_COMPLETION: roundScore(b9Mooc),
        B10_AWARDS: roundScore(b10Awards),
        B11_RESEARCH_IMPACT: roundScore(b11ResearchImpact),
        B12_EDITORIAL_REVIEW: roundScore(b12EditorialReview),
        C1_ADMIN_ROLES: roundScore(c1AdminRoles),
        C2_EXAM_DUTIES: roundScore(c2Exam),
        C3_STUDENT_GUIDANCE: roundScore(c3Guidance),
        C4_EXTENSION: roundScore(c4Extension),
        C5_FDP_WORKSHOPS: roundScore(c5Fdp),
        C6_PROFESSIONAL_BODY: roundScore(c6ProfessionalBody),
        C7_COMMUNITY_SERVICE: roundScore(c7CommunityService),
        C8_OUTREACH_PROGRAMS: roundScore(c8Outreach),
        C9_RESOURCE_PERSON: roundScore(c9ResourcePerson),
        C10_GOVERNANCE_ROLE: roundScore(c10Governance),
        A_TOTAL: roundScore(apiScore.teachingActivities),
        B_TOTAL: roundScore(apiScore.researchAcademicContribution),
        C_TOTAL: roundScore(apiScore.institutionalResponsibilities),
        API_TOTAL: roundScore(apiScore.totalScore),
    } as const;
}

async function upsertComputedIndicatorEntries(
    application: InstanceType<typeof FacultyPbasForm>,
    snapshot: PbasSnapshot,
    apiScore: ReturnType<typeof computePbasApiScore>,
    weights: PbasScoringWeights,
    options: {
        revisionId?: Types.ObjectId;
        session?: mongoose.ClientSession;
        context?: PbasReferenceContext;
    } = {}
) {
    const scoreByCode = buildIndicatorClaimedScores(snapshot, apiScore, weights, options.context);
    const indicatorCodes = Object.keys(scoreByCode);

    const indicators = await PbasIndicatorMaster.find({
        indicatorCode: { $in: indicatorCodes },
    })
        .select("_id indicatorCode maxScore")
        .lean()
        .session(options.session ?? null);

    const revisionId = options.revisionId;

    await Promise.all(
        indicators.map((indicator) => {
            const rawScore = scoreByCode[indicator.indicatorCode as keyof typeof scoreByCode] ?? 0;
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

function parseSubmissionDeadlineValue(value?: string | null) {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = dateOnlyMatch
        ? new Date(`${trimmed}T23:59:59.999Z`)
        : new Date(trimmed);

    return Number.isNaN(date.getTime()) ? null : date;
}

async function getPbasSettingsMaster() {
    return MasterData.findOne({
        category: "pbas_settings",
        key: "scoring_weights",
        isActive: true,
    }).lean();
}

export async function getPbasScoringWeightsFromMasterData() {
    const setting = await getPbasSettingsMaster();
    const raw = (setting?.metadata as { value?: unknown } | undefined)?.value ?? setting?.metadata;
    const parsed = pbasScoringWeightsSchema.safeParse(raw);

    if (!parsed.success) {
        return DEFAULT_PBAS_SCORING_WEIGHTS;
    }

    return parsed.data;
}

async function getPbasSubmissionDeadline() {
    const deadlineEntry = await MasterData.findOne({
        category: "pbas_settings",
        key: "submission_deadline",
        isActive: true,
    }).lean();

    const rawDeadline =
        (deadlineEntry?.metadata as { value?: string } | undefined)?.value ||
        deadlineEntry?.label ||
        "";

    return {
        rawDeadline,
        parsedDeadline: parseSubmissionDeadlineValue(rawDeadline),
    };
}

export async function buildPbasSnapshot(
    facultyId: Types.ObjectId,
    academicYearId?: Types.ObjectId | null
): Promise<PbasSnapshot> {
    if (!academicYearId) {
        return resolvePbasSnapshotFromReferences(
            {
                academicYearId: new Types.ObjectId(),
                academicYear: {
                    yearStart: new Date().getFullYear(),
                    yearEnd: new Date().getFullYear() + 1,
                },
                teachingSummary: null,
                teachingLoads: [],
                resultSummaries: [],
                publications: [],
                books: [],
                patents: [],
                projects: [],
                eventParticipations: [],
                adminRoles: [],
                institutionalContributions: [],
                socialExtensions: [],
                fdps: [],
                moocCourses: [],
                econtentItems: [],
                phdGuidance: [],
                awards: [],
                consultancies: [],
            },
            emptyPbasDraftReferences()
        );
    }

    const context = await loadPbasReferenceContext(facultyId, academicYearId);
    const draftReferences = deriveAutoDraftReferences(context);

    return resolvePbasSnapshotFromReferences(context, draftReferences);
}

export function computePbasApiScore(
    snapshot: PbasSnapshot,
    weights: PbasScoringWeights = DEFAULT_PBAS_SCORING_WEIGHTS
) {
    const teachingActivities = Math.min(
        weights.caps.teachingActivities,
        snapshot.category1.classesTaken * weights.category1.classesTaken +
            snapshot.category1.coursePreparationHours * weights.category1.coursePreparationHours +
            snapshot.category1.coursesTaught.length * weights.category1.coursesTaught +
            snapshot.category1.mentoringCount * weights.category1.mentoringCount +
            snapshot.category1.labSupervisionCount * weights.category1.labSupervisionCount
    );

    const researchAcademicContribution = Math.min(
        weights.caps.researchAcademicContribution,
        snapshot.category2.researchPapers.reduce(
            (sum, paper) => sum + scoreResearchPaper(paper.indexing, weights),
            0
        ) +
            snapshot.category2.books.length * weights.category2.book +
            snapshot.category2.patents.reduce((sum, patent) => sum + scorePatent(patent.status, weights), 0) +
            snapshot.category2.conferences.reduce(
                (sum, conference) => sum + scoreConference(conference.type, weights),
                0
            ) +
            snapshot.category2.projects.reduce((sum, project) => sum + scoreProject(project.amount, weights), 0)
    );

    const institutionalResponsibilities = Math.min(
        weights.caps.institutionalResponsibilities,
        snapshot.category3.committees.length * weights.category3.committee +
            snapshot.category3.administrativeDuties.length * weights.category3.administrativeDuty +
            snapshot.category3.examDuties.length * weights.category3.examDuty +
            snapshot.category3.studentGuidance.reduce(
                (sum, entry) =>
                    sum +
                    Math.min(
                        entry.count * weights.category3.studentGuidancePerUnit,
                        weights.category3.studentGuidanceMaxPerEntry
                    ),
                0
            ) +
            snapshot.category3.extensionActivities.length * weights.category3.extensionActivity
    );

    return {
        teachingActivities,
        researchAcademicContribution,
        institutionalResponsibilities,
        totalScore:
            teachingActivities + researchAcademicContribution + institutionalResponsibilities,
    };
}

function hasDraftReferenceSelection(references?: Partial<IPbasDraftReferences> | null) {
    return Boolean(
        references?.teachingSummaryId ||
            references?.teachingLoadIds?.length ||
            references?.publicationIds?.length ||
            references?.bookIds?.length ||
            references?.patentIds?.length ||
            references?.researchProjectIds?.length ||
            references?.eventParticipationIds?.length ||
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
    const candidates = serializePbasCandidatePools(context);

    return {
        context,
        candidates,
        draftReferences,
        snapshot,
        scoringWeights,
        apiScore: computePbasApiScore(snapshot, scoringWeights),
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
        forcedApiScore?: ReturnType<typeof computePbasApiScore>;
        session?: mongoose.ClientSession;
    } = {}
) {
    const draftState = await resolveDraftState(application);
    const revisionCount = await FacultyPbasRevision.countDocuments({ pbasFormId: application._id }).session(options.session ?? null);
    const references = options.forcedReferences ?? draftState.draftReferences;
    const snapshot = options.forcedSnapshot ?? draftState.snapshot;
    const apiScore = options.forcedApiScore ?? computePbasApiScore(snapshot, draftState.scoringWeights);

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

    await upsertComputedIndicatorEntries(application, snapshot, apiScore, draftState.scoringWeights, {
        revisionId: revision._id as Types.ObjectId,
        session: options.session,
        context: draftState.context,
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

async function getReviewAuthorization(application: InstanceType<typeof FacultyPbasForm>, actor: SafeActor) {
    const faculty = await getUserForApplication(application);
    const headedDepartment = await getDepartmentHeadedByUser(actor.id);
    const isDepartmentHead =
        Boolean(headedDepartment) && faculty.department === headedDepartment?.name;
    const isCommitteeReviewer = actor.role === "Admin" || actor.role === "Director";

    return {
        isDepartmentHead,
        isCommitteeReviewer,
        canReview: isDepartmentHead || isCommitteeReviewer,
    };
}

async function getDepartmentHeadedByUser(userId: string) {
    return Organization.findOne({
        type: "Department",
        headUserId: userId,
        isActive: true,
    }).select("name");
}

function pushStatusLog(
    application: InstanceType<typeof FacultyPbasForm>,
    status: PbasStatus,
    actor?: SafeActor,
    remarks?: string
) {
    application.statusLogs.push({
        status,
        actorId: actor ? new Types.ObjectId(actor.id) : undefined,
        actorName: actor?.name,
        actorRole: actor?.role,
        remarks,
        changedAt: new Date(),
    });
}

async function getUserForApplication(application: InstanceType<typeof FacultyPbasForm>) {
    const faculty = await Faculty.findById(application.facultyId).select(
        "userId departmentId designation firstName lastName"
    );

    if (!faculty?.userId) {
        throw new AuthError("Faculty account not found.", 404);
    }

    const user = await User.findById(faculty.userId).select(
        "name email role department designation universityName collegeName"
    );

    if (!user) {
        throw new AuthError("Faculty account not found.", 404);
    }

    const department = faculty.departmentId
        ? await Department.findById(faculty.departmentId).select("name")
        : null;

    return {
        ...user,
        department: department?.name ?? user.department,
        designation: faculty.designation || user.designation,
    };
}

function parseAcademicYearLabel(value: string) {
    const match = value.trim().match(/(\d{4})\D+(\d{2,4})/);

    if (!match) {
        throw new Error(`Invalid academic year "${value}".`);
    }

    const start = Number(match[1]);
    const endValue = Number(match[2]);
    const end =
        endValue < 100
            ? Number(`${String(start).slice(0, 2)}${String(endValue).padStart(2, "0")}`)
            : endValue;

    return { start, end };
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

async function ensureAcademicYear(value: string) {
    const parsed = parseAcademicYearLabel(value);
    let academicYear = await AcademicYear.findOne({
        yearStart: parsed.start,
        yearEnd: parsed.end,
    });

    if (!academicYear) {
        academicYear = await AcademicYear.create({
            yearStart: parsed.start,
            yearEnd: parsed.end,
            isActive: false,
        });
    }

    return academicYear;
}

function toAcademicYearLabel(yearStart?: number, yearEnd?: number) {
    if (!yearStart || !yearEnd) {
        return "";
    }

    return `${yearStart}-${yearEnd}`;
}

async function upsertWorkflow(
    moduleName: "PBAS",
    recordId: string,
    actorRole: string,
    status: string,
    remarks?: string,
    session?: mongoose.ClientSession
) {
    await ApprovalWorkflow.updateOne(
        { moduleName, recordId },
        {
            $set: {
                moduleName,
                recordId,
                currentApproverRole: actorRole,
                status,
                remarks,
            },
        },
        { upsert: true, session }
    );
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
    await AuditLog.create([{
        userId: actor ? new Types.ObjectId(actor.id) : undefined,
        action,
        tableName,
        recordId,
        oldData,
        newData,
    }], { session });
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

    const yearFallback = new Date().getFullYear();
    const meta = pbasApplicationSchema.parse({
        academicYear: activeYearLabel || `${yearFallback}-${yearFallback + 1}`,
        currentDesignation: normalizeDesignation(faculty.designation),
        appraisalPeriod: {
            fromDate: activeYear?.yearStart ? `${activeYear.yearStart}-06-01` : `${yearFallback}-06-01`,
            toDate: activeYear?.yearEnd ? `${activeYear.yearEnd}-05-31` : `${yearFallback + 1}-05-31`,
        },
    });
    const snapshot = await buildPbasSnapshot(faculty._id, activeYear?._id ?? null);

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
        scoringWeights,
    };
}

export async function getPbasEntriesForForm(actor: SafeActor, id: string) {
    await dbConnect();
    await ensurePbasDynamicMigration();

    const application = await getPbasApplicationById(actor, id);
    const revisionId =
        !["Draft", "Rejected"].includes(application.status) && application.activeRevisionId
            ? application.activeRevisionId
            : undefined;
    const indicators = await PbasIndicatorMaster.find({})
        .populate("categoryId", "categoryCode categoryName maxScore")
        .sort({ indicatorCode: 1 })
        .lean();

    const entries = await FacultyPbasEntry.find(
        revisionId
            ? { pbasFormId: application._id, pbasRevisionId: revisionId }
            : { pbasFormId: application._id, pbasRevisionId: { $exists: false } }
    )
        .populate("evidenceDocumentId", "fileName fileUrl fileType")
        .lean();

    const entryByIndicator = new Map<string, typeof entries[number]>();
    for (const entry of entries) {
        entryByIndicator.set(entry.indicatorId.toString(), entry);
    }

    const items = indicators.map((indicator) => {
        const entry = entryByIndicator.get(indicator._id.toString());
        return {
            indicatorId: indicator._id.toString(),
            indicatorCode: indicator.indicatorCode,
            indicatorName: indicator.indicatorName,
            category: indicator.categoryId
                ? {
                    id: (indicator.categoryId as { _id?: Types.ObjectId })._id?.toString?.(),
                    code: (indicator.categoryId as { categoryCode?: string }).categoryCode,
                    name: (indicator.categoryId as { categoryName?: string }).categoryName,
                    maxScore: (indicator.categoryId as { maxScore?: number }).maxScore,
                }
                : undefined,
            maxScore: indicator.maxScore,
            claimedScore: entry?.claimedScore ?? 0,
            approvedScore: entry?.approvedScore,
            evidenceDocument: entry?.evidenceDocumentId || null,
            remarks: entry?.remarks,
        };
    });

    return {
        applicationId: application._id.toString(),
        revisionId: revisionId?.toString(),
        status: application.status,
        submissionStatus: application.submissionStatus,
        items,
    };
}

export async function upsertPbasEntryForForm(
    actor: SafeActor,
    id: string,
    input: { indicatorId: string; claimedScore?: number; evidenceDocumentId?: string; remarks?: string }
) {
    await dbConnect();
    await ensurePbasDynamicMigration();

    const application = await getPbasApplicationById(actor, id);

    if (!["Draft", "Rejected"].includes(application.status)) {
        throw new AuthError("PBAS entries can only be updated in Draft or Rejected status.", 409);
    }

    const indicator = await PbasIndicatorMaster.findById(input.indicatorId).select("_id indicatorCode maxScore");
    if (!indicator) {
        throw new AuthError("PBAS indicator not found.", 404);
    }

    const existing = await FacultyPbasEntry.findOne({
        pbasFormId: application._id,
        pbasRevisionId: { $exists: false },
        indicatorId: indicator._id,
    });

    const claimedScore =
        typeof input.claimedScore === "number"
            ? input.claimedScore
            : existing?.claimedScore ?? 0;

    if (!Number.isFinite(claimedScore) || claimedScore < 0) {
        throw new AuthError("Claimed score must be a non-negative number.", 400);
    }

    if (claimedScore > indicator.maxScore) {
        throw new AuthError(
            `Claimed score cannot exceed indicator maximum of ${indicator.maxScore}.`,
            400
        );
    }

    let evidenceDocumentId: Types.ObjectId | undefined = existing?.evidenceDocumentId;
    if (input.evidenceDocumentId !== undefined) {
        if (!Types.ObjectId.isValid(input.evidenceDocumentId)) {
            throw new AuthError("Invalid evidence document id.", 400);
        }

        const evidenceDocument = await DocumentModel.findById(input.evidenceDocumentId)
            .select("_id uploadedBy")
            .lean();

        if (!evidenceDocument) {
            throw new AuthError("Evidence document not found.", 404);
        }

        if (!evidenceDocument.uploadedBy || evidenceDocument.uploadedBy.toString() !== actor.id) {
            throw new AuthError("You can only attach evidence documents uploaded by your account.", 403);
        }

        const conflict = await FacultyPbasEntry.findOne({
            evidenceDocumentId: new Types.ObjectId(input.evidenceDocumentId),
            $or: [
                { facultyId: { $ne: application.facultyId } },
                { academicYearId: { $ne: application.academicYearId } },
            ],
        })
            .select("_id")
            .lean();

        if (conflict) {
            throw new AuthError(
                "This evidence document is already linked to another faculty or academic-year PBAS record.",
                409
            );
        }

        evidenceDocumentId = new Types.ObjectId(input.evidenceDocumentId);
    }

    await FacultyPbasEntry.updateOne(
        { pbasFormId: application._id, indicatorId: indicator._id },
        {
            $set: {
                pbasFormId: application._id,
                indicatorId: indicator._id,
                facultyId: application.facultyId,
                academicYearId: application.academicYearId,
                claimedScore,
                evidenceDocumentId,
                remarks: input.remarks ?? existing?.remarks,
            },
            $unset: {
                pbasRevisionId: 1,
            },
        },
        { upsert: true }
    );

    await syncPbasTotalEntries(application._id.toString());

    return getPbasEntriesForForm(actor, application._id.toString());
}

export async function moderatePbasEntriesForForm(actor: SafeActor, id: string, rawInput: unknown) {
    await dbConnect();
    await ensurePbasDynamicMigration();

    const input = pbasEntryModerationSchema.parse(rawInput);
    const application = await getPbasApplicationById(actor, id);
    const auth = await getReviewAuthorization(application, actor);

    if (!auth.canReview) {
        throw new AuthError("You are not authorized to moderate PBAS indicator scores.", 403);
    }

    if (!["Submitted", "Under Review", "Committee Review"].includes(application.status)) {
        throw new AuthError("Indicator moderation is allowed only during PBAS review stages.", 409);
    }

    const revisionId = application.activeRevisionId || application.latestSubmittedRevisionId;

    if (!revisionId) {
        throw new AuthError("No active PBAS revision found for moderation.", 409);
    }

    const indicatorIds = Array.from(new Set(input.updates.map((item) => item.indicatorId)));
    if (indicatorIds.some((id) => !Types.ObjectId.isValid(id))) {
        throw new AuthError("One or more indicator ids are invalid.", 400);
    }

    const indicators = await PbasIndicatorMaster.find({
        _id: { $in: indicatorIds.map((entry) => new Types.ObjectId(entry)) },
    })
        .select("_id maxScore")
        .lean();
    const indicatorById = new Map(indicators.map((item) => [item._id.toString(), item]));

    if (indicatorById.size !== indicatorIds.length) {
        throw new AuthError("One or more PBAS indicators were not found.", 404);
    }

    await Promise.all(
        input.updates.map(async (item) => {
            const indicator = indicatorById.get(item.indicatorId);
            if (!indicator) {
                throw new AuthError("PBAS indicator not found.", 404);
            }

            const existing = await FacultyPbasEntry.findOne({
                pbasFormId: application._id,
                pbasRevisionId: revisionId,
                indicatorId: new Types.ObjectId(item.indicatorId),
            })
                .select("claimedScore remarks")
                .lean();

            const claimedScore = existing?.claimedScore ?? 0;
            if (item.approvedScore > indicator.maxScore) {
                throw new AuthError(
                    `Approved score cannot exceed indicator maximum of ${indicator.maxScore}.`,
                    400
                );
            }

            if (item.approvedScore > claimedScore) {
                throw new AuthError("Approved score cannot exceed claimed score.", 400);
            }

            await FacultyPbasEntry.updateOne(
                {
                    pbasFormId: application._id,
                    pbasRevisionId: revisionId,
                    indicatorId: new Types.ObjectId(item.indicatorId),
                },
                {
                    $set: {
                        pbasFormId: application._id,
                        pbasRevisionId: revisionId,
                        indicatorId: new Types.ObjectId(item.indicatorId),
                        facultyId: application.facultyId,
                        academicYearId: application.academicYearId,
                        claimedScore,
                        approvedScore: item.approvedScore,
                        remarks: item.remarks ?? existing?.remarks,
                    },
                },
                { upsert: true }
            );
        })
    );

    await audit(actor, "PBAS_ENTRY_MODERATE", "faculty_pbas_entries", application._id.toString(), undefined, {
        revisionId: revisionId.toString(),
        updates: input.updates.length,
    });

    return getPbasEntriesForForm(actor, application._id.toString());
}

export async function createPbasApplication(actor: SafeActor, rawInput: unknown) {
    const input = pbasApplicationSchema.parse(rawInput);
    assertAppraisalPeriodWithinAcademicYear(input);
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

    const academicYear = await ensureAcademicYear(input.academicYear);
    const context = await loadPbasReferenceContext(faculty._id, academicYear._id);
    const scoringWeights = await getPbasScoringWeightsFromMasterData();
    const draftReferences = deriveAutoDraftReferences(context);
    const snapshot = resolvePbasSnapshotFromReferences(context, draftReferences);
    const apiScore = computePbasApiScore(snapshot, scoringWeights);

    const existing = await FacultyPbasForm.findOne({
        facultyId: faculty._id,
        academicYearId: academicYear._id,
    });

    if (existing) {
        await upsertWorkflow("PBAS", existing._id.toString(), actor.role, existing.status, "PBAS draft already exists.");
        await audit(actor, "PBAS_CREATE_IDEMPOTENT", "faculty_pbas_forms", existing._id.toString());
        return buildApplicationResponse(existing);
    }

    const application = await FacultyPbasForm.create({
        facultyId: faculty._id,
        academicYearId: academicYear._id,
        academicYear: input.academicYear,
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

    await upsertComputedIndicatorEntries(application, snapshot, apiScore, scoringWeights, {
        context,
    });
    await syncPbasTotalEntries(application._id.toString());
    await upsertWorkflow("PBAS", application._id.toString(), actor.role, application.status, "PBAS draft created.");
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

    const headedDepartment = await getDepartmentHeadedByUser(actor.id);

    if (headedDepartment) {
        const facultyUser = await getUserForApplication(application);
        if (facultyUser.department === headedDepartment.name) {
            return application;
        }
    }

    throw new AuthError("You do not have access to this PBAS application.", 403);
}

export async function updatePbasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = pbasApplicationSchema.parse(rawInput);
    assertAppraisalPeriodWithinAcademicYear(input);
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
    const academicYear = await ensureAcademicYear(input.academicYear);
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
    application.academicYearId = academicYear._id;
    application.academicYear = input.academicYear;
    application.currentDesignation = input.currentDesignation;
    application.appraisalPeriod = input.appraisalPeriod;
    application.draftReferences = nextDraftReferences;
    application.apiScore = computePbasApiScore(snapshot, scoringWeights);
    application.submissionStatus = ["Draft", "Rejected"].includes(application.status) ? "Draft" : "Submitted";

    await application.save();
    await upsertComputedIndicatorEntries(application, snapshot, application.apiScore, scoringWeights, {
        context,
    });
    await syncPbasTotalEntries(application._id.toString());
    await upsertWorkflow("PBAS", application._id.toString(), actor.role, application.status, "PBAS draft updated.");
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

    application.draftReferences = safeReferences;
    application.apiScore = computePbasApiScore(snapshot, scoringWeights);
    await application.save();
    await upsertComputedIndicatorEntries(application, snapshot, application.apiScore, scoringWeights, {
        context,
    });
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

            await ApprovalWorkflow.deleteOne(
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

    if (
        actor.role !== "Faculty" ||
        application.facultyId.toString() !== facultyContext?.faculty._id.toString()
    ) {
        throw new AuthError("Only the faculty owner can submit this PBAS application.", 403);
    }

    try {
        assertPbasTransition(application.status, "Submitted", { actionLabel: "submit" });
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
            await upsertComputedIndicatorEntries(
                txApplication,
                draftState.snapshot,
                draftState.apiScore,
                draftState.scoringWeights,
                { session, context: draftState.context }
            );

            await createRevisionFromDraft(txApplication, actor, {
                migrationSource: "runtime_submit",
                forcedSnapshot: draftState.snapshot,
                forcedReferences: draftState.draftReferences,
                forcedApiScore: draftState.apiScore,
                session,
            });

            txApplication.status = "Submitted";
            txApplication.submissionStatus = "Submitted";
            txApplication.submittedAt = new Date();
            pushStatusLog(txApplication, "Submitted", actor, "Faculty submitted PBAS application.");
            await txApplication.save({ session });
            await upsertWorkflow("PBAS", txApplication._id.toString(), actor.role, txApplication.status, "PBAS submitted.", session);
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

    return buildApplicationResponse(refreshed);
}

export async function reviewPbasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = pbasReviewSchema.parse(rawInput);
    const application = await getPbasApplicationById(actor, id);

    const { isDepartmentHead, canReview } = await getReviewAuthorization(application, actor);

    if (!canReview) {
        throw new AuthError("You are not authorized to review this PBAS application.", 403);
    }

    try {
        deriveReviewTransition(application.status, input.decision);
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

            let nextStatus: PbasStatus;
            try {
                nextStatus = deriveReviewTransition(txApplication.status, input.decision);
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
                    designation: actor.role === "Admin" ? "Admin Reviewer" : "Department Head",
                    remarks: input.remarks,
                    decision: input.decision,
                    stage: isDepartmentHead ? "Department Head" : "PBAS Committee",
                    reviewedAt: new Date(),
                });
                pushStatusLog(txApplication, "Rejected", actor, input.remarks);
                await txApplication.save({ session });
                await upsertWorkflow("PBAS", txApplication._id.toString(), actor.role, txApplication.status, input.remarks, session);
                await audit(actor, "PBAS_REVIEW_REJECT", "faculty_pbas_forms", txApplication._id.toString(), undefined, {
                    status: txApplication.status,
                    remarks: input.remarks,
                }, session);
                return;
            }

            txApplication.status = nextStatus;
            txApplication.reviewCommittee.push({
                reviewerId: new Types.ObjectId(actor.id),
                reviewerName: actor.name,
                reviewerRole: actor.role,
                designation:
                    nextStatus === "Under Review"
                        ? "Department Head Reviewer"
                        : "PBAS Committee Reviewer",
                remarks: input.remarks,
                decision: input.decision,
                stage: nextStatus === "Under Review" ? "Department Head" : "PBAS Committee",
                reviewedAt: new Date(),
            });
            pushStatusLog(txApplication, nextStatus, actor, input.remarks);
            await txApplication.save({ session });
            await upsertWorkflow("PBAS", txApplication._id.toString(), actor.role, txApplication.status, input.remarks, session);
            await audit(actor, "PBAS_REVIEW", "faculty_pbas_forms", txApplication._id.toString(), undefined, {
                status: txApplication.status,
                remarks: input.remarks,
            }, session);
        });
    } finally {
        await session.endSession();
    }

    const refreshed = await FacultyPbasForm.findById(application._id);
    if (!refreshed) {
        throw new AuthError("PBAS application not found after review.", 404);
    }

    return buildApplicationResponse(refreshed);
}

export async function approvePbasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = pbasApprovalSchema.parse(rawInput);

    if (actor.role !== "Admin") {
        throw new AuthError("Only admin users can finalize PBAS approval.", 403);
    }

    const application = await getPbasApplicationById(actor, id);
    const finalStatus: PbasStatus = input.decision === "Approve" ? "Approved" : "Rejected";

    try {
        assertPbasTransition(application.status, finalStatus, { actionLabel: "final approval" });
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
                assertPbasTransition(txApplication.status, finalStatus, { actionLabel: "final approval" });
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
                designation: "Admin Final Approver",
                remarks: input.remarks,
                decision: input.decision,
                stage: "Admin",
                reviewedAt: new Date(),
            });
            pushStatusLog(txApplication, txApplication.status, actor, input.remarks);
            await txApplication.save({ session });
            if (input.decision === "Approve") {
                await markRevisionApproved(txApplication.activeRevisionId, actor, session);
            }
            revisionIdForTotals = txApplication.activeRevisionId?.toString();
            await upsertWorkflow("PBAS", txApplication._id.toString(), actor.role, txApplication.status, input.remarks, session);
            await audit(actor, "PBAS_APPROVE", "faculty_pbas_forms", txApplication._id.toString(), undefined, {
                status: txApplication.status,
                decision: input.decision,
                remarks: input.remarks,
            }, session);
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

    return buildApplicationResponse(refreshed);
}

export async function getPbasReviewQueue(actor: SafeActor) {
    await dbConnect();
    await ensurePbasDynamicMigration();

    if (actor.role === "Admin") {
        return FacultyPbasForm.find({
            status: { $in: ["Under Review", "Committee Review", "Submitted"] },
        }).sort({ updatedAt: -1 });
    }

    const headedDepartment = await getDepartmentHeadedByUser(actor.id);

    if (!headedDepartment) {
        return [];
    }

    const departments = await Department.find({ name: headedDepartment.name }).select("_id");
    const facultyUsers = await Faculty.find({
        departmentId: { $in: departments.map((item) => item._id) },
    }).select("_id");

    return FacultyPbasForm.find({
        facultyId: { $in: facultyUsers.map((item) => item._id) },
        status: { $in: ["Submitted", "Under Review"] },
    }).sort({ updatedAt: -1 });
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
