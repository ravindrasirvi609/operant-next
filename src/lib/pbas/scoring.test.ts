import { describe, expect, it } from "vitest";

import {
    buildRawIndicatorScores,
    DEFAULT_PBAS_SCORING_WEIGHTS,
    roundScore,
} from "@/lib/pbas/scoring";
import type { PbasSnapshot } from "@/lib/pbas/validators";
import type { PbasReferenceContext } from "@/lib/pbas/references";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid snapshot — every array empty, every number 0. */
function emptySnapshot(): PbasSnapshot {
    return {
        category1: {
            classesTaken: 0,
            coursePreparationHours: 0,
            coursesTaught: [],
            mentoringCount: 0,
            labSupervisionCount: 0,
            feedbackSummary: "",
        },
        category2: {
            researchPapers: [],
            books: [],
            patents: [],
            conferences: [],
            projects: [],
        },
        category3: {
            committees: [],
            administrativeDuties: [],
            examDuties: [],
            studentGuidance: [],
            extensionActivities: [],
        },
    } as unknown as PbasSnapshot;
}

/** All 30 formula keys produced by buildRawIndicatorScores. */
const ALL_KEYS = [
    "A1_TEACHING_LOAD", "A2_COURSE_PREP", "A3_MENTORING", "A4_LAB_SUPERVISION",
    "A5_INNOVATIVE_PEDAGOGY", "A6_CURRICULUM_DEV", "A7_ECONTENT_DEVELOPMENT",
    "A8_STUDENT_FEEDBACK", "A9_ASSESSMENT_INNOVATION",
    "B1_RESEARCH_PAPERS", "B2_BOOKS_CHAPTERS", "B3_PATENTS", "B4_CONFERENCES",
    "B5_PROJECTS", "B6_RESEARCH_GUIDANCE", "B7_CONSULTANCY", "B8_ECONTENT",
    "B9_MOOC_COMPLETION", "B10_AWARDS", "B11_RESEARCH_IMPACT", "B12_EDITORIAL_REVIEW",
    "C1_ADMIN_ROLES", "C2_EXAM_DUTIES", "C3_STUDENT_GUIDANCE", "C4_EXTENSION",
    "C5_FDP_WORKSHOPS", "C6_PROFESSIONAL_BODY", "C7_COMMUNITY_SERVICE",
    "C8_OUTREACH_PROGRAMS", "C9_RESOURCE_PERSON", "C10_GOVERNANCE_ROLE",
];

const W = DEFAULT_PBAS_SCORING_WEIGHTS;

// ---------------------------------------------------------------------------
// roundScore
// ---------------------------------------------------------------------------

describe("roundScore", () => {
    it("rounds to 2 decimal places", () => {
        expect(roundScore(1.234)).toBe(1.23);
        expect(roundScore(1.236)).toBe(1.24);
        expect(roundScore(2.999)).toBe(3);
        // floating-point accumulation (0.1 + 0.2 = 0.30000…) is corrected
        expect(roundScore(0.1 + 0.2)).toBe(0.3);
    });

    it("returns exact integers unchanged", () => {
        expect(roundScore(5)).toBe(5);
        expect(roundScore(0)).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// buildRawIndicatorScores — empty snapshot
// ---------------------------------------------------------------------------

describe("buildRawIndicatorScores — empty snapshot", () => {
    it("returns all 30 keys", () => {
        const scores = buildRawIndicatorScores(emptySnapshot(), W);
        for (const key of ALL_KEYS) {
            expect(scores).toHaveProperty(key);
        }
        expect(Object.keys(scores)).toHaveLength(ALL_KEYS.length);
    });

    it("all scores are 0 for an empty snapshot with no context", () => {
        const scores = buildRawIndicatorScores(emptySnapshot(), W);
        for (const key of ALL_KEYS) {
            expect(scores[key]).toBe(0);
        }
    });
});

// ---------------------------------------------------------------------------
// buildRawIndicatorScores — Category A (teaching)
// ---------------------------------------------------------------------------

describe("buildRawIndicatorScores — Category A", () => {
    it("A1: classesTaken × weight", () => {
        const snap = emptySnapshot();
        (snap as any).category1.classesTaken = 10;
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.A1_TEACHING_LOAD).toBe(roundScore(10 * W.category1.classesTaken));
    });

    it("A2: coursePreparationHours × weight", () => {
        const snap = emptySnapshot();
        (snap as any).category1.coursePreparationHours = 20;
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.A2_COURSE_PREP).toBe(roundScore(20 * W.category1.coursePreparationHours));
    });

    it("A3: mentoringCount × weight", () => {
        const snap = emptySnapshot();
        (snap as any).category1.mentoringCount = 5;
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.A3_MENTORING).toBe(roundScore(5 * W.category1.mentoringCount));
    });

    it("A5: non-empty feedbackSummary → innovativePedagogyPoints", () => {
        const snap = emptySnapshot();
        (snap as any).category1.feedbackSummary = "Some feedback";
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.A5_INNOVATIVE_PEDAGOGY).toBe(W.phase2.innovativePedagogyPoints);
    });

    it("A5: empty feedbackSummary → 0", () => {
        const scores = buildRawIndicatorScores(emptySnapshot(), W);
        expect(scores.A5_INNOVATIVE_PEDAGOGY).toBe(0);
    });

    it("A4: labSupervisionCount × labSupervisionCount weight", () => {
        const snap = emptySnapshot();
        (snap as any).category1.labSupervisionCount = 4;
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.A4_LAB_SUPERVISION).toBe(roundScore(4 * W.category1.labSupervisionCount));
    });

    it("A6: coursesTaught length × curriculumDevPerCourse", () => {
        const snap = emptySnapshot();
        (snap as any).category1.coursesTaught = ["Math", "Physics"];
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.A6_CURRICULUM_DEV).toBe(roundScore(2 * W.phase2.curriculumDevPerCourse));
    });
});

// ---------------------------------------------------------------------------
// buildRawIndicatorScores — Category B (research)
// ---------------------------------------------------------------------------

describe("buildRawIndicatorScores — Category B", () => {
    it("B1: Scopus paper scores researchPaperHigh", () => {
        const snap = emptySnapshot();
        (snap as any).category2.researchPapers = [{ indexing: "Scopus" }];
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.B1_RESEARCH_PAPERS).toBe(W.category2.researchPaperHigh);
    });

    it("B1: peer-reviewed paper scores researchPaperMedium", () => {
        const snap = emptySnapshot();
        (snap as any).category2.researchPapers = [{ indexing: "Peer Reviewed" }];
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.B1_RESEARCH_PAPERS).toBe(W.category2.researchPaperMedium);
    });

    it("B1: unrecognised indexing scores researchPaperDefault", () => {
        const snap = emptySnapshot();
        (snap as any).category2.researchPapers = [{ indexing: "Local Journal" }];
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.B1_RESEARCH_PAPERS).toBe(W.category2.researchPaperDefault);
    });

    it("B1: accumulates multiple papers", () => {
        const snap = emptySnapshot();
        (snap as any).category2.researchPapers = [
            { indexing: "Scopus" },
            { indexing: "UGC CARE" },
            { indexing: "Local" },
        ];
        const scores = buildRawIndicatorScores(snap, W);
        const expected = roundScore(
            W.category2.researchPaperHigh +
            W.category2.researchPaperHigh +
            W.category2.researchPaperDefault
        );
        expect(scores.B1_RESEARCH_PAPERS).toBe(expected);
    });

    it("B2: books count × book weight", () => {
        const snap = emptySnapshot();
        (snap as any).category2.books = [{}, {}];
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.B2_BOOKS_CHAPTERS).toBe(roundScore(2 * W.category2.book));
    });

    it("B3: granted patent scores patentGranted", () => {
        const snap = emptySnapshot();
        (snap as any).category2.patents = [{ status: "Granted" }];
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.B3_PATENTS).toBe(W.category2.patentGranted);
    });

    it("B4: international conference scores conferenceInternational", () => {
        const snap = emptySnapshot();
        (snap as any).category2.conferences = [{ type: "International" }];
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.B4_CONFERENCES).toBe(W.category2.conferenceInternational);
    });

    it("B5: large project (≥ projectLargeAmount) scores projectLarge", () => {
        const snap = emptySnapshot();
        (snap as any).category2.projects = [{ amount: W.category2.projectLargeAmount }];
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.B5_PROJECTS).toBe(W.category2.projectLarge);
    });

    it("B5: medium project scores projectMedium", () => {
        const snap = emptySnapshot();
        (snap as any).category2.projects = [{ amount: W.category2.projectMediumAmount }];
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.B5_PROJECTS).toBe(W.category2.projectMedium);
    });

    it("B5: small project scores projectDefault", () => {
        const snap = emptySnapshot();
        (snap as any).category2.projects = [{ amount: 1000 }];
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.B5_PROJECTS).toBe(W.category2.projectDefault);
    });
});

// ---------------------------------------------------------------------------
// buildRawIndicatorScores — Category C (institutional)
// ---------------------------------------------------------------------------

describe("buildRawIndicatorScores — Category C", () => {
    it("C1: committee membership × committee weight", () => {
        const snap = emptySnapshot();
        (snap as any).category3.committees = [{}];
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.C1_ADMIN_ROLES).toBe(W.category3.committee);
    });

    it("C1: admin duty adds administrativeDuty weight", () => {
        const snap = emptySnapshot();
        (snap as any).category3.administrativeDuties = [{}];
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.C1_ADMIN_ROLES).toBe(W.category3.administrativeDuty);
    });

    it("C2: examDuties count × examDuty weight", () => {
        const snap = emptySnapshot();
        (snap as any).category3.examDuties = [{}, {}];
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.C2_EXAM_DUTIES).toBe(roundScore(2 * W.category3.examDuty));
    });

    it("C3: student guidance capped per entry", () => {
        const snap = emptySnapshot();
        const maxPerEntry = W.category3.studentGuidanceMaxPerEntry;
        const perUnit = W.category3.studentGuidancePerUnit;
        // count large enough that count * perUnit > maxPerEntry
        (snap as any).category3.studentGuidance = [{ count: maxPerEntry * 2 }];
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.C3_STUDENT_GUIDANCE).toBe(maxPerEntry);
        // two entries each at max
        (snap as any).category3.studentGuidance = [{ count: maxPerEntry * 2 }, { count: maxPerEntry * 2 }];
        const scores2 = buildRawIndicatorScores(snap, W);
        expect(scores2.C3_STUDENT_GUIDANCE).toBe(roundScore(2 * maxPerEntry));
    });

    it("C4: extensionActivities count × extensionActivity weight", () => {
        const snap = emptySnapshot();
        (snap as any).category3.extensionActivities = [{}, {}, {}];
        const scores = buildRawIndicatorScores(snap, W);
        expect(scores.C4_EXTENSION).toBe(roundScore(3 * W.category3.extensionActivity));
    });
});

// ---------------------------------------------------------------------------
// buildRawIndicatorScores — Phase-2 without context
// ---------------------------------------------------------------------------

describe("buildRawIndicatorScores — phase-2 without context", () => {
    const PHASE2_KEYS = [
        "B6_RESEARCH_GUIDANCE", "B7_CONSULTANCY", "B8_ECONTENT",
        "B9_MOOC_COMPLETION", "B10_AWARDS", "B11_RESEARCH_IMPACT", "B12_EDITORIAL_REVIEW",
        "C5_FDP_WORKSHOPS", "C6_PROFESSIONAL_BODY", "C7_COMMUNITY_SERVICE",
        "C8_OUTREACH_PROGRAMS", "C9_RESOURCE_PERSON", "C10_GOVERNANCE_ROLE",
    ];

    it("all context-dependent phase-2 keys are 0 when context is absent", () => {
        const scores = buildRawIndicatorScores(emptySnapshot(), W);
        for (const key of PHASE2_KEYS) {
            expect(scores[key], `expected ${key} to be 0`).toBe(0);
        }
    });
});

// ---------------------------------------------------------------------------
// buildRawIndicatorScores — Phase-2 with context
// ---------------------------------------------------------------------------

describe("buildRawIndicatorScores — phase-2 with context", () => {
    it("C5: FDP items × fdpPerItem", () => {
        const context = { fdps: [{}, {}] } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.C5_FDP_WORKSHOPS).toBe(roundScore(2 * W.phase2.fdpPerItem));
    });

    it("B6: completed PhD guidance scores researchGuidanceCompleted", () => {
        const context = {
            phdGuidance: [{ status: "completed" }, { status: "ongoing" }],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        const expected = roundScore(W.phase2.researchGuidanceCompleted + W.phase2.researchGuidanceOngoing);
        expect(scores.B6_RESEARCH_GUIDANCE).toBe(expected);
    });

    it("B10: international award scores awardsInternational", () => {
        const context = {
            awards: [{ awardLevel: "International" }],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.B10_AWARDS).toBe(W.phase2.awardsInternational);
    });

    it("B11: publication with high impact factor scores researchImpactHigh", () => {
        const context = {
            publications: [{ impactFactor: 6 }],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.B11_RESEARCH_IMPACT).toBe(W.phase2.researchImpactHigh);
    });

    it("B11: publication with zero impact factor scores 0", () => {
        const context = {
            publications: [{ impactFactor: 0 }],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.B11_RESEARCH_IMPACT).toBe(0);
    });

    it("C10: IQAC role counts as governance", () => {
        const context = {
            adminRoles: [{ roleName: "IQAC Coordinator" }],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.C10_GOVERNANCE_ROLE).toBe(W.phase2.governancePerRole);
    });

    it("C10: unrecognised role does not count as governance", () => {
        const context = {
            adminRoles: [{ roleName: "Lab Assistant" }],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.C10_GOVERNANCE_ROLE).toBe(0);
    });

    it("B7: consultancy items × consultancyPerProject", () => {
        const context = {
            consultancies: [{}, {}],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.B7_CONSULTANCY).toBe(roundScore(2 * W.phase2.consultancyPerProject));
    });

    it("B8: econtent items × researchEcontentPerItem", () => {
        const context = {
            econtentItems: [{}, {}, {}],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.B8_ECONTENT).toBe(roundScore(3 * W.phase2.researchEcontentPerItem));
    });

    it("B9: MOOC courses × moocCompletionPerCourse", () => {
        const context = {
            moocCourses: [{}],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.B9_MOOC_COMPLETION).toBe(W.phase2.moocCompletionPerCourse);
    });

    it("B10: national award scores awardsNational", () => {
        const context = {
            awards: [{ awardLevel: "National" }],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.B10_AWARDS).toBe(W.phase2.awardsNational);
    });

    it("B10: college-level award scores awardsCollege", () => {
        const context = {
            awards: [{ awardLevel: "College" }],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.B10_AWARDS).toBe(W.phase2.awardsCollege);
    });

    it("B12: Chair and ResourcePerson roles both count for editorial review", () => {
        const context = {
            eventParticipations: [
                { role: "Chair" },
                { role: "ResourcePerson" },
                { role: "Attendee" },
            ],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.B12_EDITORIAL_REVIEW).toBe(roundScore(2 * W.phase2.editorialReviewPerRole));
    });

    it("C6: membership role counts as professional body", () => {
        const context = {
            institutionalContributions: [{ role: "Membership" }, { role: "Teacher" }],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.C6_PROFESSIONAL_BODY).toBe(W.phase2.professionalBodyPerMembership);
    });

    it("C7: social extension activities × communityServicePerActivity", () => {
        const context = {
            socialExtensions: [{}, {}, {}],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.C7_COMMUNITY_SERVICE).toBe(roundScore(3 * W.phase2.communityServicePerActivity));
    });

    it("C8: outreach uses same socialExtensions count × outreachPerActivity", () => {
        const context = {
            socialExtensions: [{}, {}],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.C8_OUTREACH_PROGRAMS).toBe(roundScore(2 * W.phase2.outreachPerActivity));
    });

    it("C9: ResourcePerson event participations × resourcePersonPerEvent", () => {
        const context = {
            eventParticipations: [
                { role: "ResourcePerson" },
                { role: "ResourcePerson" },
                { role: "Chair" },
            ],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.C9_RESOURCE_PERSON).toBe(roundScore(2 * W.phase2.resourcePersonPerEvent));
    });

    it("A7: econtent items × econtentDevelopmentPerItem", () => {
        const context = {
            econtentItems: [{}, {}],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.A7_ECONTENT_DEVELOPMENT).toBe(roundScore(2 * W.phase2.econtentDevelopmentPerItem));
    });

    it("A8: result summaries avg / studentFeedbackDivisor", () => {
        const context = {
            resultSummaries: [{ passPercentage: 80 }, { passPercentage: 60 }],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.A8_STUDENT_FEEDBACK).toBe(
            roundScore(70 / W.phase2.studentFeedbackDivisor)
        );
    });

    it("A9: high outcome students trigger assessmentInnovation points", () => {
        const context = {
            resultSummaries: [
                { universityRankStudents: 2 },
                { universityRankStudents: 0 },
            ],
        } as unknown as PbasReferenceContext;
        const scores = buildRawIndicatorScores(emptySnapshot(), W, context);
        expect(scores.A9_ASSESSMENT_INNOVATION).toBe(W.phase2.assessmentInnovationPerHighOutcome);
    });
});
