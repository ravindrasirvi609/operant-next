import { Building2, ClipboardCheck, FileText, FlaskConical, GraduationCap } from "lucide-react";

import type { StepDescriptor } from "@/components/ui/stepper";
import type {
    PbasCandidateOption,
    PbasCandidatePools,
    PbasReferenceKey,
    PbasSourceStep,
} from "@/components/pbas/pbas-types";
import type { PbasSnapshot } from "@/lib/pbas/validators";

/**
 * PBAS source-selection steps, described as data.
 *
 * Two duplications collapse into this file.
 *
 * **The step components.** `pbas-step-teaching-sources.tsx`,
 * `-research-sources.tsx`, and `-institutional-sources.tsx` were the same 70-line
 * file three times, differing only in a fallback label string, the snapshot card
 * rendered at the bottom, and the `key` prefix on a mapped list. They are now one
 * component driven by `pbasSourceSteps`.
 *
 * **The candidate-to-row mapping.** `pbas-dashboard.tsx` built its `sourceTables`
 * in a 240-line `useMemo` (lines 253–493) that repeated the same five-argument
 * `toRows(...)` call nineteen times, each with a hand-written pool path,
 * reference key, and profile section slug. Nothing checked that the reference key
 * matched the pool it was drawn from, and two entries in the institutional group
 * legitimately share one reference key (`adminRoleIds` covers committees,
 * administrative duties, *and* exam duties) — a coupling that was invisible in
 * the original and is explicit here.
 */

export type PbasSourceGroupConfig = {
    title: string;
    /** Row-level type label, e.g. "Publication". */
    sourceType: string;
    /** Draft-reference array this group toggles. */
    referenceKey: PbasReferenceKey;
    /** Faculty profile section for the row's "Edit source" deep link. */
    section: string;
    /** True for `teachingSummaryId`, which holds one id rather than an array. */
    single?: boolean;
    pool: (candidates: PbasCandidatePools) => PbasCandidateOption[];
};

export type PbasSnapshotTile = { label: string; value: number };

// `description` is replaced rather than added to: StepDescriptor's is a plain
// string, and these three steps derive theirs from the faculty's designation.
export type PbasSourceStepConfig = Omit<StepDescriptor, "description"> & {
    key: PbasSourceStep;
    /** Copy varies by designation — senior roles are assessed differently. */
    descriptionFor: (designationKey: string) => string;
    snapshotTitle: string;
    snapshotTiles: (snapshot: PbasSnapshot) => PbasSnapshotTile[];
    groups: PbasSourceGroupConfig[];
};

/** Wraps the one optional single-value pool so every `pool` returns an array. */
const optional = (value?: PbasCandidateOption) => (value ? [value] : []);

export const pbasSourceSteps: PbasSourceStepConfig[] = [
    {
        key: "teaching",
        id: "teaching",
        title: "Teaching Sources",
        descriptionFor: (designationKey) =>
            designationKey === "professor"
                ? "Senior-role PBAS focuses on how teaching complements leadership and mentoring."
                : "Teaching summary and load records for this PBAS draft.",
        icon: GraduationCap,
        snapshotTitle: "Teaching snapshot",
        snapshotTiles: (snapshot) => [
            { label: "Classes taken", value: snapshot.category1.classesTaken },
            { label: "Courses taught", value: snapshot.category1.coursesTaught.length },
            { label: "Mentoring", value: snapshot.category1.mentoringCount },
            { label: "Lab supervision", value: snapshot.category1.labSupervisionCount },
        ],
        groups: [
            {
                title: "Teaching Summary",
                sourceType: "Teaching Summary",
                referenceKey: "teachingSummaryId",
                section: "teaching-summary",
                single: true,
                pool: (candidates) => optional(candidates.category1.teachingSummary),
            },
            {
                title: "Teaching Load",
                sourceType: "Teaching Load",
                referenceKey: "teachingLoadIds",
                section: "teaching-load",
                pool: (candidates) => candidates.category1.teachingLoads,
            },
            {
                title: "Result Summary",
                sourceType: "Result Summary",
                referenceKey: "resultSummaryIds",
                section: "result-summary",
                pool: (candidates) => candidates.category1.resultSummaries,
            },
        ],
    },
    {
        key: "research",
        id: "research",
        title: "Research Sources",
        descriptionFor: (designationKey) =>
            designationKey === "early_assistant"
                ? "Publications, books, patents, projects, and conferences included in this PBAS."
                : "Research records are emphasized for PBAS differentiation at your designation.",
        icon: FlaskConical,
        snapshotTitle: "Research snapshot",
        snapshotTiles: (snapshot) => [
            { label: "Papers", value: snapshot.category2.researchPapers.length },
            { label: "Books", value: snapshot.category2.books.length },
            { label: "Patents", value: snapshot.category2.patents.length },
            { label: "Projects", value: snapshot.category2.projects.length },
            { label: "Conferences", value: snapshot.category2.conferences.length },
        ],
        groups: [
            {
                title: "Publications",
                sourceType: "Publication",
                referenceKey: "publicationIds",
                section: "publications",
                pool: (candidates) => candidates.category2.researchPapers,
            },
            {
                title: "Books",
                sourceType: "Book",
                referenceKey: "bookIds",
                section: "books",
                pool: (candidates) => candidates.category2.books,
            },
            {
                title: "Patents",
                sourceType: "Patent",
                referenceKey: "patentIds",
                section: "patents",
                pool: (candidates) => candidates.category2.patents,
            },
            {
                title: "Research Projects",
                sourceType: "Research Project",
                referenceKey: "researchProjectIds",
                section: "projects",
                pool: (candidates) => candidates.category2.projects,
            },
            {
                title: "Conferences / Events",
                sourceType: "Conference/Event",
                referenceKey: "eventParticipationIds",
                section: "events",
                pool: (candidates) => candidates.category2.conferences,
            },
            {
                title: "PhD Guidance",
                sourceType: "PhD Guidance",
                referenceKey: "phdGuidanceIds",
                section: "phd-guidance",
                pool: (candidates) => candidates.category2.phdGuidance,
            },
            {
                title: "Consultancy",
                sourceType: "Consultancy",
                referenceKey: "consultancyIds",
                section: "consultancy",
                pool: (candidates) => candidates.category2.consultancies,
            },
            {
                title: "E-content",
                sourceType: "E-content",
                referenceKey: "econtentIds",
                section: "econtent",
                pool: (candidates) => candidates.category2.econtentItems,
            },
            {
                title: "MOOC / SWAYAM",
                sourceType: "MOOC Course",
                referenceKey: "moocCourseIds",
                section: "mooc-courses",
                pool: (candidates) => candidates.category2.moocCourses,
            },
            {
                title: "Awards",
                sourceType: "Award",
                referenceKey: "awardIds",
                section: "awards",
                pool: (candidates) => candidates.category2.awards,
            },
        ],
    },
    {
        key: "institutional",
        id: "institutional",
        title: "Institutional Sources",
        descriptionFor: (designationKey) =>
            designationKey === "early_assistant"
                ? "Admin roles, guidance, and extension entries included in this PBAS."
                : "Leadership and stewardship records included for institutional contribution.",
        icon: Building2,
        snapshotTitle: "Institutional snapshot",
        snapshotTiles: (snapshot) => [
            { label: "Committees", value: snapshot.category3.committees.length },
            { label: "Admin duties", value: snapshot.category3.administrativeDuties.length },
            { label: "Exam duties", value: snapshot.category3.examDuties.length },
            {
                label: "Guidance",
                value: snapshot.category3.studentGuidance.reduce((sum, item) => sum + item.count, 0),
            },
            { label: "Extension activities", value: snapshot.category3.extensionActivities.length },
        ],
        groups: [
            // Committees, administrative duties, and exam duties all persist to
            // `adminRoleIds`. Toggling a row in one group therefore affects the
            // same reference array the other two read from.
            {
                title: "Committees",
                sourceType: "Committee",
                referenceKey: "adminRoleIds",
                section: "admin-roles",
                pool: (candidates) => candidates.category3.committees,
            },
            {
                title: "Administrative Duties",
                sourceType: "Administrative Duty",
                referenceKey: "adminRoleIds",
                section: "admin-roles",
                pool: (candidates) => candidates.category3.administrativeDuties,
            },
            {
                title: "Exam Duties",
                sourceType: "Exam Duty",
                referenceKey: "adminRoleIds",
                section: "admin-roles",
                pool: (candidates) => candidates.category3.examDuties,
            },
            {
                title: "Student Guidance",
                sourceType: "Student Guidance",
                referenceKey: "institutionalContributionIds",
                section: "institutional-contributions",
                pool: (candidates) => candidates.category3.studentGuidance,
            },
            {
                title: "Extension Activities",
                sourceType: "Extension Activity",
                referenceKey: "socialExtensionIds",
                section: "social-extension",
                pool: (candidates) => candidates.category3.extensionActivities,
            },
            {
                title: "FDP / Workshops",
                sourceType: "FDP / Workshop",
                referenceKey: "fdpIds",
                section: "fdp-conducted",
                pool: (candidates) => candidates.category3.fdps,
            },
        ],
    },
];

/** Wizard steps: application details, the three source steps, then review. */
export const pbasSteps: StepDescriptor[] = [
    {
        id: "details",
        title: "Application Details",
        description: "Year, designation, appraisal period",
        icon: FileText,
    },
    ...pbasSourceSteps.map(({ key, title, descriptionFor, icon }) => ({
        id: key,
        title,
        // The stepper card shows the generic wording; the step body shows the
        // designation-specific line, where there is room for it.
        description: descriptionFor("default"),
        icon,
    })),
    {
        id: "review",
        title: "Score and Review",
        description: "API score, evidence, submission",
        icon: ClipboardCheck,
    },
];

export const PBAS_DETAILS_STEP_FIELDS = [
    "academicYearId",
    "academicYear",
    "currentDesignation",
    "appraisalPeriod.fromDate",
    "appraisalPeriod.toDate",
];

export function buildProfileEditHref(section: string, id: string) {
    return `/faculty/profile?section=${encodeURIComponent(section)}&editId=${encodeURIComponent(id)}`;
}
