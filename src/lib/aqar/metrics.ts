import { aqarSections, aqarSteps } from "@/lib/aqar/form-config";

/**
 * AQAR contribution counts and the weighted contribution index.
 *
 * The original `computeMetrics` (aqar-dashboard.tsx:231-261) listed all twelve
 * arrays twice: once to produce the `*Count` fields and again inside a single
 * 12-term arithmetic expression for `totalContributionIndex`, with each weight
 * written as a bare literal next to a repeated `facultyContribution.x.length`.
 * Adding a thirteenth section meant editing three places and hoping the weight
 * landed in the right term.
 *
 * The weights are the same values, now stated once per section.
 */

type SectionKey = keyof typeof aqarSections;

/**
 * Per-section weight and the metric field the API stores it under. The metric
 * names are the server's, so they cannot be derived from the section key.
 */
const SECTION_METRICS: Record<SectionKey, { metric: string; weight: number }> = {
    researchPapers: { metric: "researchPaperCount", weight: 5 },
    seedMoneyProjects: { metric: "seedMoneyProjectCount", weight: 5 },
    awardsRecognition: { metric: "awardRecognitionCount", weight: 4 },
    fellowships: { metric: "fellowshipCount", weight: 4 },
    researchFellows: { metric: "researchFellowCount", weight: 4 },
    patents: { metric: "patentCount", weight: 6 },
    phdAwards: { metric: "phdAwardCount", weight: 5 },
    booksChapters: { metric: "bookChapterCount", weight: 4 },
    eContentDeveloped: { metric: "eContentCount", weight: 3 },
    consultancyServices: { metric: "consultancyCount", weight: 4 },
    financialSupport: { metric: "financialSupportCount", weight: 2 },
    facultyDevelopmentProgrammes: { metric: "fdpCount", weight: 2 },
};

export type AqarMetrics = Record<string, number> & { totalContributionIndex: number };

type ContributionShape = Record<string, unknown[]>;

export function computeAqarMetrics(contribution: ContributionShape): AqarMetrics {
    const metrics: Record<string, number> = {};
    let index = 0;

    for (const [key, { metric, weight }] of Object.entries(SECTION_METRICS)) {
        const count = contribution[key]?.length ?? 0;
        metrics[metric] = count;
        index += count * weight;
    }

    return { ...metrics, totalContributionIndex: index };
}

export type AqarSectionReadiness = {
    label: string;
    count: number;
    /** Step id, so a "fix this" link can jump straight to the right step. */
    stepId: string;
};

/**
 * Per-step record counts, used by the review step's readiness list.
 *
 * The original hardcoded the same five groupings a second time in a
 * `summarySections` memo — including re-adding `awardsRecognition +
 * fellowships + researchFellows` by hand, which is exactly the grouping the step
 * config already expresses. Derived from `aqarSteps` here, so a section that moves
 * between steps stays counted under the step it actually lives on.
 */
export function computeAqarReadiness(contribution: ContributionShape): AqarSectionReadiness[] {
    return aqarSteps
        .filter((step) => step.sections.length > 0)
        .map((step) => ({
            label: step.title,
            stepId: step.id,
            count: step.sections.reduce((total, key) => total + (contribution[key]?.length ?? 0), 0),
        }));
}

/** Section-level rows for the read-only contribution tables. */
export function summarizeAqarSections(contribution: ContributionShape) {
    return (Object.keys(SECTION_METRICS) as SectionKey[])
        .map((key) => {
            const config = aqarSections[key];
            const rows = (contribution[key] ?? []) as Array<Record<string, unknown>>;

            return {
                key,
                title: config.title,
                itemLabel: config.itemLabel,
                rows: rows.map((row) => config.summary(row)),
            };
        })
        .filter((section) => section.rows.length > 0);
}
