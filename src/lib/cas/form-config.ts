import {
    Award,
    CalendarRange,
    ClipboardCheck,
    FileCheck2,
    FileText,
    Library,
    Link2,
    UserCog,
} from "lucide-react";

import type { RepeatableSectionConfig } from "@/components/forms/repeatable-section";
import type { StepDescriptor } from "@/components/ui/stepper";

/**
 * CAS promotion form, described as data.
 *
 * The three "optional additions" editors (publications, books, research
 * projects) were separate step components rendering bare, unlabeled
 * `<Input placeholder="Journal" />` grids — see cas-step-publications.tsx:26-30.
 * With no `<Label>` and no `FormMessage`, a zod failure on those fields produced
 * no visible feedback at all; the user only learned something was wrong when the
 * step's "Fix" badge appeared, with nothing to say which field it meant.
 *
 * Routing them through `RepeatableSection` gives every field a real label, an
 * error message, and one `emptyItem()` — checked against the schema in
 * form-config.test.ts.
 */

const currentYear = () => new Date().getFullYear();

const MANUAL = "manualAchievements";

export const casSections: Record<string, RepeatableSectionConfig> = {
    publications: {
        id: "cas-publications",
        title: "Additional Publications",
        description:
            "Only add publications that are not already covered by your PBAS-linked data — duplicates are not scored twice.",
        arrayName: `${MANUAL}.publications`,
        itemLabel: "Publication",
        fields: [
            { kind: "text", name: "title", label: "Publication title", span: 2 },
            { kind: "text", name: "journal", label: "Journal name" },
            { kind: "number", name: "year", label: "Publication year", min: 1900, max: 2100 },
            { kind: "text", name: "issn", label: "ISSN" },
            { kind: "text", name: "indexing", label: "Indexing (Scopus, WoS, UGC-CARE…)" },
        ],
        emptyItem: () => ({ title: "", journal: "", year: currentYear(), issn: "", indexing: "" }),
        summary: (item) => ({
            primary: String(item.title ?? ""),
            secondary: [item.journal, item.year].filter(Boolean).join(" · "),
        }),
    },

    books: {
        id: "cas-books",
        title: "Additional Books",
        description: "Authored or edited books not already present in your linked PBAS achievements.",
        arrayName: `${MANUAL}.books`,
        itemLabel: "Book",
        fields: [
            { kind: "text", name: "title", label: "Book title", span: 2 },
            { kind: "text", name: "publisher", label: "Publisher" },
            { kind: "number", name: "year", label: "Publication year", min: 1900, max: 2100 },
            { kind: "text", name: "isbn", label: "ISBN" },
        ],
        emptyItem: () => ({ title: "", publisher: "", year: currentYear(), isbn: "" }),
        summary: (item) => ({
            primary: String(item.title ?? ""),
            secondary: [item.publisher, item.year].filter(Boolean).join(" · "),
        }),
    },

    researchProjects: {
        id: "cas-research-projects",
        title: "Additional Research Projects",
        description: "Funded projects not already present in your linked PBAS achievements.",
        arrayName: `${MANUAL}.researchProjects`,
        itemLabel: "Project",
        fields: [
            { kind: "text", name: "title", label: "Project title", span: 2 },
            { kind: "text", name: "fundingAgency", label: "Funding agency" },
            { kind: "number", name: "amount", label: "Sanctioned amount (INR)", min: 0 },
            { kind: "number", name: "year", label: "Award year", min: 1900, max: 2100 },
        ],
        emptyItem: () => ({ title: "", fundingAgency: "", amount: 0, year: currentYear() }),
        summary: (item) => ({
            primary: String(item.title ?? ""),
            secondary: [item.fundingAgency, item.year].filter(Boolean).join(" · "),
        }),
    },
};

export type CasStep = StepDescriptor & {
    /** Field paths the step owns, for per-step "needs attention" detection. */
    fields: string[];
};

/**
 * Steps now carry an icon and a description. The originals were
 * `casStepTitles.map((title, index) => ({ id: String(index), title }))` — a bare
 * title and a numeric id, which made the stepper a row of unlabeled boxes and
 * meant `hasStepErrors` had to switch on magic indices 6 and 7.
 */
export const casSteps: CasStep[] = [
    {
        id: "basic-details",
        title: "Basic Details",
        description: "Year, current and target designation.",
        icon: UserCog,
        fields: ["applicationYearId", "applicationYear", "currentDesignation", "applyingForDesignation"],
    },
    {
        id: "eligibility-period",
        title: "Eligibility Period",
        description: "Assessment window and service length.",
        icon: CalendarRange,
        // The parent path, not the two leaves. When `eligibilityPeriod` is absent
        // entirely, zod reports the issue at "eligibilityPeriod" — the original
        // `casStepFieldPaths[1]` listed only the leaves, so that case produced no
        // "needs attention" badge. `hasErrorAtPath` on the parent catches both
        // the parent-level error and any nested one.
        fields: ["eligibilityPeriod", "experienceYears"],
    },
    {
        id: "pbas-reports",
        title: "PBAS Reports",
        description: "Link the approved PBAS years to draw on.",
        icon: Link2,
        fields: ["pbasReports"],
    },
    {
        id: "publications",
        title: "Publications",
        description: "Optional additions beyond PBAS.",
        icon: FileText,
        fields: ["manualAchievements.publications"],
    },
    {
        id: "books-projects",
        title: "Books and Projects",
        description: "Optional additions beyond PBAS.",
        icon: Library,
        fields: ["manualAchievements.books", "manualAchievements.researchProjects"],
    },
    {
        id: "academic-contributions",
        title: "Academic Contributions",
        description: "PhD guidance and conference counts.",
        icon: Award,
        fields: ["manualAchievements.phdGuided", "manualAchievements.conferences"],
    },
    {
        id: "documents",
        title: "Documents",
        description: "Mandatory evidence checklist.",
        icon: FileCheck2,
        fields: [],
    },
    {
        id: "review",
        title: "Review and Submit",
        description: "Final checks and submission.",
        icon: ClipboardCheck,
        fields: [],
    },
];

/** Step ids referenced by name rather than index, so reordering is safe. */
export const CAS_DOCUMENTS_STEP = "documents";
export const CAS_REVIEW_STEP = "review";
