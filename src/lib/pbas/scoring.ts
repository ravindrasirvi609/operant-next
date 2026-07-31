import mongoose, { Types } from "mongoose";

import PbasIndicatorMaster from "@/models/core/pbas-indicator-master";
import PbasCategoryMaster from "@/models/core/pbas-category-master";
import type { IPbasApiScore } from "@/models/core/pbas-snapshot-schema";
import { type PbasScoringWeights, type PbasSnapshot } from "@/lib/pbas/validators";
import { type PbasReferenceContext } from "@/lib/pbas/references";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PbasIndicatorCatalogEntry = {
    _id: Types.ObjectId;
    indicatorCode: string;
    formulaKey: string;
    maxScore: number;
    categoryCode?: string;
};

export type PbasDynamicScorecard = {
    /** Final capped scores per category plus total — shape matches IPbasApiScore. */
    apiScore: IPbasApiScore;
    /** Raw + rollup scores keyed by formula key (A1_TEACHING_LOAD … API_TOTAL). */
    claimedScores: Record<string, number>;
    indicators: PbasIndicatorCatalogEntry[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Baseline weights and category caps; overridden at runtime by `pbas_settings` master data. */
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

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Round to 2 decimal places. */
export function roundScore(value: number) {
    return Math.round(value * 100) / 100;
}

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

// ---------------------------------------------------------------------------
// Core scoring functions
// ---------------------------------------------------------------------------

/**
 * Compute raw (uncapped) score for each of the 30 PBAS formula keys.
 * Phase-2 indicators (A5–A9, B6–B12, C5–C10) score 0 when context is absent.
 * Returns a flat Record so downstream catalog-clamping can look up by formulaKey.
 */
export function buildRawIndicatorScores(
    snapshot: PbasSnapshot,
    weights: PbasScoringWeights,
    context?: PbasReferenceContext
): Record<string, number> {
    // Category A — Teaching activities
    const a1TeachingLoad = snapshot.category1.classesTaken * weights.category1.classesTaken;
    const a2CoursePrep = snapshot.category1.coursePreparationHours * weights.category1.coursePreparationHours;
    const a3Mentoring = snapshot.category1.mentoringCount * weights.category1.mentoringCount;
    const a4Lab = snapshot.category1.labSupervisionCount * weights.category1.labSupervisionCount;

    // Category B — Research & academic contribution
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

    // Category C — Institutional responsibilities
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

    // Phase-2 derived indicators — require PbasReferenceContext
    const avgResultPercentage = context?.resultSummaries?.length
        ? context.resultSummaries.reduce(
            (sum, item) => sum + Number(item.passPercentage ?? item.resultPercentage ?? 0),
            0
        ) / context.resultSummaries.length
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
        (context?.eventParticipations?.filter((item) => item.role === "ResourcePerson").length ?? 0) *
        weights.phase2.resourcePersonPerEvent;
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
    };
}

/**
 * Load indicator metadata and per-category caps from master data.
 * Falls back to DEFAULT_PBAS_SCORING_WEIGHTS caps when the catalog has no data for a category.
 */
export async function loadPbasIndicatorCatalog(session?: mongoose.ClientSession) {
    const [indicators, categories] = await Promise.all([
        PbasIndicatorMaster.find({})
            .populate("categoryId", "categoryCode")
            .select("_id indicatorCode formulaKey maxScore categoryId")
            .lean()
            .session(session ?? null),
        PbasCategoryMaster.find({ categoryCode: { $in: ["A", "B", "C"] } })
            .select("categoryCode maxScore")
            .lean()
            .session(session ?? null),
    ]);

    const categoryCaps = {
        A:
            categories.find((item) => item.categoryCode === "A")?.maxScore ??
            DEFAULT_PBAS_SCORING_WEIGHTS.caps.teachingActivities,
        B:
            categories.find((item) => item.categoryCode === "B")?.maxScore ??
            DEFAULT_PBAS_SCORING_WEIGHTS.caps.researchAcademicContribution,
        C:
            categories.find((item) => item.categoryCode === "C")?.maxScore ??
            DEFAULT_PBAS_SCORING_WEIGHTS.caps.institutionalResponsibilities,
    };

    const normalizedIndicators: PbasIndicatorCatalogEntry[] = indicators.map((indicator) => ({
        _id: indicator._id as Types.ObjectId,
        indicatorCode: indicator.indicatorCode,
        formulaKey: indicator.formulaKey || indicator.indicatorCode,
        maxScore: indicator.maxScore,
        categoryCode:
            (indicator.categoryId as { categoryCode?: string } | null | undefined)?.categoryCode,
    }));

    return {
        indicators: normalizedIndicators,
        categoryCaps,
    };
}

/**
 * Full scoring pipeline: raw indicator scores → per-indicator catalog clamping →
 * per-category caps → IPbasApiScore.
 *
 * This is the single scoring path used by all submit/update flows in pbas/service.ts.
 * The legacy computePbasApiScore function was removed — all apiScore writes go through here.
 */
export async function computePbasDynamicScorecard(
    snapshot: PbasSnapshot,
    weights: PbasScoringWeights = DEFAULT_PBAS_SCORING_WEIGHTS,
    context?: PbasReferenceContext,
    options: { session?: mongoose.ClientSession } = {}
): Promise<PbasDynamicScorecard> {
    const rawScores = buildRawIndicatorScores(snapshot, weights, context);
    const { indicators, categoryCaps } = await loadPbasIndicatorCatalog(options.session);
    const categoryTotals = { A: 0, B: 0, C: 0 };

    for (const indicator of indicators) {
        // Skip rollup rows — these are derived, not scored individually
        if (
            indicator.indicatorCode === "A_TOTAL" ||
            indicator.indicatorCode === "B_TOTAL" ||
            indicator.indicatorCode === "C_TOTAL" ||
            indicator.indicatorCode === "API_TOTAL"
        ) {
            continue;
        }

        const rawScore = rawScores[indicator.formulaKey] ?? rawScores[indicator.indicatorCode] ?? 0;
        const claimedScore = roundScore(Math.min(Math.max(rawScore, 0), indicator.maxScore));

        if (indicator.categoryCode === "A" || indicator.categoryCode === "B" || indicator.categoryCode === "C") {
            categoryTotals[indicator.categoryCode] += claimedScore;
        }
    }

    const apiScore: IPbasApiScore = {
        teachingActivities: roundScore(Math.min(categoryCaps.A, categoryTotals.A)),
        researchAcademicContribution: roundScore(Math.min(categoryCaps.B, categoryTotals.B)),
        institutionalResponsibilities: roundScore(Math.min(categoryCaps.C, categoryTotals.C)),
        totalScore: 0,
    };

    apiScore.totalScore = roundScore(
        apiScore.teachingActivities +
            apiScore.researchAcademicContribution +
            apiScore.institutionalResponsibilities
    );

    return {
        apiScore,
        indicators,
        claimedScores: {
            ...rawScores,
            A_TOTAL: apiScore.teachingActivities,
            B_TOTAL: apiScore.researchAcademicContribution,
            C_TOTAL: apiScore.institutionalResponsibilities,
            API_TOTAL: apiScore.totalScore,
        },
    };
}
