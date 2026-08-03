import {
    BookOpenText,
    ClipboardCheck,
    FolderKanban,
    GraduationCap,
    Layers3,
    Sparkles,
    Trophy,
} from "lucide-react";

import type { SelectFieldOption } from "@/components/forms/rhf-fields";
import type { RepeatableSectionConfig } from "@/components/forms/repeatable-section";
import type { StepDescriptor } from "@/components/ui/stepper";

/**
 * AQAR faculty contribution form, described as data.
 *
 * The twelve contribution editors were ~1,150 lines of JSX in
 * aqar-dashboard.tsx, and every one of them wrote its "new empty entry" object
 * literal out twice — once for the empty-state Add button and once for the
 * footer Add button (see aqar-dashboard.tsx:1197 and :1218 for the same
 * eleven-key literal repeated verbatim). Nothing kept the pairs in sync, and
 * nothing tied either copy to the zod schema they had to satisfy.
 *
 * Here each section has exactly one `emptyItem()`, and form-config.test.ts
 * asserts that it parses against its schema and that every declared field name
 * exists in that schema. A typo in a field path is now a failing test rather
 * than a silently dead input.
 *
 * Field labels are carried over verbatim from the original markup.
 */

// --- shared option lists (were module consts in the component) ---------------

export const fundingAgencyOptions: SelectFieldOption[] = [
    { label: "Government", value: "Government" },
    { label: "Non-Government", value: "Non-Government" },
];

export const projectCategoryOptions: SelectFieldOption[] = [
    { label: "Major", value: "Major" },
    { label: "Minor", value: "Minor" },
];

export const awardLevelOptions: SelectFieldOption[] = [
    { label: "State", value: "State" },
    { label: "National", value: "National" },
    { label: "International", value: "International" },
];

export const levelOptions: SelectFieldOption[] = [
    { label: "National", value: "National" },
    { label: "International", value: "International" },
];

export const phdStatusOptions: SelectFieldOption[] = [
    { label: "Awarded", value: "Awarded" },
    { label: "Submitted", value: "Submitted" },
];

export const reviewChecklistItems = [
    "I verified dates, academic years, and faculty names across all AQAR sections.",
    "I confirmed the evidence references, links, and proof notes are ready for NAAC review.",
    "I reviewed the summary counts and I am ready to submit this AQAR contribution.",
] as const;

/**
 * Default year for new entries. A function, not a const — a module-level
 * `new Date()` would freeze the year at build time on a long-lived server.
 */
const currentYear = () => new Date().getFullYear();

const CONTRIBUTION = "facultyContribution";

/** Trimmed string, so `.min(2)` schema fields report their own message. */
const text = (name: string, label: string, span?: 1 | 2 | "full") =>
    ({ kind: "text" as const, name, label, ...(span ? { span } : {}) });

const num = (name: string, label: string, min = 0) =>
    ({ kind: "number" as const, name, label, min });

const date = (name: string, label: string) => ({ kind: "date" as const, name, label });

const upload = (name: string, label: string) => ({ kind: "upload" as const, name, label });

const select = (name: string, label: string, options: SelectFieldOption[]) =>
    ({ kind: "select" as const, name, label, options });

/** The AQAR year label field, which appears in nine of the twelve sections. */
const yearLabel = (name = "year") => text(name, "AQAR year label");

// --- sections ---------------------------------------------------------------

export const aqarSections: Record<string, RepeatableSectionConfig> = {
    researchPapers: {
        id: "research-papers",
        title: "Research Papers",
        description: "Journal publications in UGC-notified journals for this reporting year.",
        arrayName: `${CONTRIBUTION}.researchPapers`,
        itemLabel: "Research paper",
        fields: [
            text("paperTitle", "Paper title", 2),
            text("journalName", "Journal name"),
            text("authors", "Author(s)"),
            num("publicationYear", "Publication year", 1900),
            text("issnNumber", "ISSN number"),
            yearLabel(),
            text("impactFactor", "Impact factor"),
            text("indexedIn", "Indexed in"),
            text("links", "Links", 2),
            upload("proof", "Proof document"),
            upload("ifProof", "Impact factor proof"),
        ],
        emptyItem: () => ({
            paperTitle: "",
            journalName: "",
            authors: "",
            publicationYear: currentYear(),
            issnNumber: "",
            year: "",
            impactFactor: "",
            indexedIn: "",
            links: "",
            proof: "",
            ifProof: "",
        }),
        summary: (item) => ({
            primary: String(item.paperTitle ?? ""),
            secondary: [item.journalName, item.publicationYear].filter(Boolean).join(" · "),
        }),
    },

    seedMoneyProjects: {
        id: "seed-money-projects",
        title: "Seed Money Projects",
        description: "Institution-supported research or innovation projects, with funding details.",
        arrayName: `${CONTRIBUTION}.seedMoneyProjects`,
        itemLabel: "Project",
        fields: [
            text("schemeOrProjectTitle", "Scheme or project title", 2),
            text("principalInvestigatorName", "Principal investigator"),
            text("coInvestigator", "Co-investigator"),
            text("fundingAgencyName", "Funding agency"),
            select("fundingAgencyType", "Funding agency type", fundingAgencyOptions),
            num("awardYear", "Award year", 1900),
            text("projectDuration", "Project duration"),
            num("fundsInInr", "Funds (INR)"),
            select("projectCategory", "Project category", projectCategoryOptions),
            text("status", "Project status"),
            yearLabel(),
            upload("proof", "Proof document"),
        ],
        emptyItem: () => ({
            schemeOrProjectTitle: "",
            principalInvestigatorName: "",
            coInvestigator: "",
            fundingAgencyName: "",
            fundingAgencyType: "Government",
            awardYear: currentYear(),
            projectDuration: "",
            fundsInInr: 0,
            projectCategory: "Minor",
            status: "",
            year: "",
            proof: "",
        }),
        summary: (item) => ({
            primary: String(item.schemeOrProjectTitle ?? ""),
            secondary: [item.fundingAgencyName, item.awardYear].filter(Boolean).join(" · "),
        }),
    },

    awardsRecognition: {
        id: "awards-recognition",
        title: "Awards and Recognition",
        description: "Teacher awards, recognitions, and any associated incentives.",
        arrayName: `${CONTRIBUTION}.awardsRecognition`,
        itemLabel: "Award",
        fields: [
            text("awardName", "Award name", 2),
            text("teacherName", "Teacher name"),
            date("awardDate", "Award date"),
            text("pan", "PAN"),
            text("designation", "Designation"),
            select("level", "Level", awardLevelOptions),
            text("awardAgencyName", "Award agency"),
            text("incentiveDetails", "Incentive details"),
            yearLabel(),
            upload("proof", "Proof document"),
        ],
        emptyItem: () => ({
            teacherName: "",
            awardDate: "",
            pan: "",
            designation: "",
            awardName: "",
            level: "National",
            awardAgencyName: "",
            incentiveDetails: "",
            year: "",
            proof: "",
        }),
        summary: (item) => ({
            primary: String(item.awardName ?? ""),
            secondary: [item.awardAgencyName, item.level].filter(Boolean).join(" · "),
        }),
    },

    fellowships: {
        id: "fellowships",
        title: "Fellowships and Financial Support",
        description: "Fellowships awarded to you by national or international agencies.",
        arrayName: `${CONTRIBUTION}.fellowships`,
        itemLabel: "Fellowship",
        fields: [
            text("fellowshipName", "Fellowship name", 2),
            text("teacherName", "Teacher name"),
            text("awardingAgency", "Awarding agency"),
            num("awardYear", "Award year", 1900),
            select("level", "Level", levelOptions),
            yearLabel(),
            upload("proof", "Proof document"),
        ],
        emptyItem: () => ({
            teacherName: "",
            fellowshipName: "",
            awardingAgency: "",
            awardYear: currentYear(),
            level: "National",
            year: "",
            proof: "",
        }),
        summary: (item) => ({
            primary: String(item.fellowshipName ?? ""),
            secondary: [item.awardingAgency, item.awardYear].filter(Boolean).join(" · "),
        }),
    },

    researchFellows: {
        id: "research-fellows",
        title: "Research Fellows",
        description: "Fellows enrolled under your guidance, with fellowship source and duration.",
        arrayName: `${CONTRIBUTION}.researchFellows`,
        itemLabel: "Research fellow",
        fields: [
            text("fellowName", "Research fellow name", 2),
            date("enrolmentDate", "Enrolment date"),
            text("fellowshipDuration", "Fellowship duration"),
            text("fellowshipType", "Fellowship type"),
            text("grantingAgency", "Granting agency"),
            text("qualifyingExam", "Qualifying exam"),
            yearLabel(),
            upload("proof", "Proof document"),
        ],
        emptyItem: () => ({
            fellowName: "",
            enrolmentDate: "",
            fellowshipDuration: "",
            fellowshipType: "",
            grantingAgency: "",
            qualifyingExam: "",
            year: "",
            proof: "",
        }),
        summary: (item) => ({
            primary: String(item.fellowName ?? ""),
            secondary: [item.fellowshipType, item.grantingAgency].filter(Boolean).join(" · "),
        }),
    },

    patents: {
        id: "patents",
        title: "Patents",
        description: "Patents filed, published, or granted during the reporting period.",
        arrayName: `${CONTRIBUTION}.patents`,
        itemLabel: "Patent",
        fields: [
            text("title", "Title", 2),
            text("type", "Type"),
            text("patenterName", "Patenter name"),
            text("patentNumber", "Patent number"),
            date("filingDate", "Filing date"),
            date("publishedDate", "Published date"),
            text("status", "Patent status"),
            select("level", "Level", levelOptions),
            num("awardYear", "Award year", 1900),
            text("academicYear", "Academic year label"),
            upload("proof", "Proof document"),
        ],
        emptyItem: () => ({
            type: "",
            patenterName: "",
            patentNumber: "",
            filingDate: "",
            publishedDate: "",
            title: "",
            status: "",
            level: "National",
            awardYear: currentYear(),
            academicYear: "",
            proof: "",
        }),
        summary: (item) => ({
            primary: String(item.title ?? ""),
            secondary: [item.patentNumber, item.status].filter(Boolean).join(" · "),
        }),
    },

    phdAwards: {
        id: "phd-awards",
        title: "PhD Awards",
        description: "Scholars who submitted or were awarded a doctoral degree under your guidance.",
        arrayName: `${CONTRIBUTION}.phdAwards`,
        itemLabel: "PhD award",
        fields: [
            text("scholarName", "Scholar name", 2),
            text("thesisTitle", "Thesis title", 2),
            text("departmentName", "Department name"),
            text("guideName", "Guide name"),
            date("registrationDate", "Registration date"),
            text("gender", "Gender"),
            text("category", "Category"),
            text("degree", "Degree"),
            select("awardStatus", "Award status", phdStatusOptions),
            num("scholarRegistrationYear", "Registration year", 1900),
            num("awardYear", "Award year", 1900),
            yearLabel(),
            upload("proof", "Proof document"),
        ],
        emptyItem: () => ({
            scholarName: "",
            departmentName: "",
            guideName: "",
            thesisTitle: "",
            registrationDate: "",
            gender: "",
            category: "",
            degree: "",
            awardStatus: "Awarded",
            scholarRegistrationYear: currentYear(),
            awardYear: currentYear(),
            year: "",
            proof: "",
        }),
        summary: (item) => ({
            primary: String(item.scholarName ?? ""),
            secondary: [item.awardStatus, item.thesisTitle].filter(Boolean).join(" · "),
        }),
    },

    booksChapters: {
        id: "books-chapters",
        title: "Books and Chapters",
        description: "Books, chapters, proceedings, and translation work published this year.",
        arrayName: `${CONTRIBUTION}.booksChapters`,
        itemLabel: "Book or chapter",
        fields: [
            text("titleOfWork", "Title of work", 2),
            text("type", "Type"),
            text("titleOfChapter", "Title of chapter"),
            text("paperTitle", "Paper title"),
            text("translationWork", "Translation work"),
            text("proceedingsTitle", "Proceedings title"),
            text("conferenceName", "Conference name"),
            select("level", "Level", levelOptions),
            num("publicationYear", "Publication year", 1900),
            text("isbnIssnNumber", "ISBN / ISSN"),
            text("affiliationInstitute", "Affiliation institute"),
            text("publisherName", "Publisher name"),
            text("academicYear", "Academic year label"),
            upload("proof", "Proof document"),
        ],
        emptyItem: () => ({
            type: "",
            titleOfWork: "",
            titleOfChapter: "",
            paperTitle: "",
            translationWork: "",
            proceedingsTitle: "",
            conferenceName: "",
            level: "National",
            publicationYear: currentYear(),
            isbnIssnNumber: "",
            affiliationInstitute: "",
            publisherName: "",
            academicYear: "",
            proof: "",
        }),
        summary: (item) => ({
            primary: String(item.titleOfWork ?? ""),
            secondary: [item.type, item.publisherName].filter(Boolean).join(" · "),
        }),
    },

    eContentDeveloped: {
        id: "e-content",
        title: "E-content Developed",
        description: "Modules and courses you created, and the platform hosting them.",
        arrayName: `${CONTRIBUTION}.eContentDeveloped`,
        itemLabel: "E-content module",
        fields: [
            text("moduleName", "Module or course name", 2),
            text("creationType", "Creation type"),
            text("platform", "Platform"),
            text("academicYear", "Academic year label"),
            text("linkToContent", "Link to content", 2),
            upload("proof", "Proof document"),
        ],
        emptyItem: () => ({
            moduleName: "",
            creationType: "",
            platform: "",
            academicYear: "",
            linkToContent: "",
            proof: "",
        }),
        summary: (item) => ({
            primary: String(item.moduleName ?? ""),
            secondary: [item.platform, item.creationType].filter(Boolean).join(" · "),
        }),
    },

    consultancyServices: {
        id: "consultancy",
        title: "Consultancy Services",
        description: "Consultancy engagements and the revenue they generated.",
        arrayName: `${CONTRIBUTION}.consultancyServices`,
        itemLabel: "Consultancy",
        fields: [
            text("consultancyProjectName", "Consultancy project name", 2),
            text("consultantName", "Consultant name"),
            text("sponsoringAgencyContact", "Sponsoring agency contact"),
            num("consultancyYear", "Consultancy year", 1900),
            num("revenueGeneratedInInr", "Revenue generated (INR)"),
            yearLabel(),
            upload("proof", "Proof document"),
        ],
        emptyItem: () => ({
            consultantName: "",
            consultancyProjectName: "",
            sponsoringAgencyContact: "",
            consultancyYear: currentYear(),
            revenueGeneratedInInr: 0,
            year: "",
            proof: "",
        }),
        summary: (item) => ({
            primary: String(item.consultancyProjectName ?? ""),
            secondary: [item.sponsoringAgencyContact, item.consultancyYear].filter(Boolean).join(" · "),
        }),
    },

    financialSupport: {
        id: "financial-support",
        title: "Conference Financial Support",
        description: "Institutional or professional-body support received to attend conferences.",
        arrayName: `${CONTRIBUTION}.financialSupport`,
        itemLabel: "Support record",
        fields: [
            text("conferenceName", "Conference name", 2),
            text("professionalBodyName", "Professional body"),
            num("amountOfSupport", "Amount of support"),
            text("panNo", "PAN number"),
            yearLabel(),
            upload("proof", "Proof document"),
        ],
        emptyItem: () => ({
            conferenceName: "",
            professionalBodyName: "",
            amountOfSupport: 0,
            panNo: "",
            year: "",
            proof: "",
        }),
        summary: (item) => ({
            primary: String(item.conferenceName ?? ""),
            secondary: [item.professionalBodyName, item.year].filter(Boolean).join(" · "),
        }),
    },

    facultyDevelopmentProgrammes: {
        id: "fdp",
        title: "Faculty Development Programmes",
        description: "FDPs, workshops, and training programmes you attended or conducted.",
        arrayName: `${CONTRIBUTION}.facultyDevelopmentProgrammes`,
        itemLabel: "Programme",
        fields: [
            text("programTitle", "Programme title", 2),
            text("organizedBy", "Organized by"),
            date("durationFrom", "Duration from"),
            date("durationTo", "Duration to"),
            yearLabel(),
            upload("proof", "Proof document"),
        ],
        emptyItem: () => ({
            programTitle: "",
            organizedBy: "",
            durationFrom: "",
            durationTo: "",
            year: "",
            proof: "",
        }),
        summary: (item) => ({
            primary: String(item.programTitle ?? ""),
            secondary: [item.organizedBy, item.year].filter(Boolean).join(" · "),
        }),
    },
};

// --- steps ------------------------------------------------------------------

export type AqarStep = StepDescriptor & {
    /** Section keys rendered on this step, in order. */
    sections: Array<keyof typeof aqarSections>;
    /** Non-section field paths owned by the step, for error detection. */
    fields: string[];
};

export const aqarSteps: AqarStep[] = [
    {
        id: "overview",
        title: "Overview",
        description: "Academic year and reporting period.",
        icon: Sparkles,
        sections: [],
        // `reportingPeriod` is the parent path, not its two leaves: when the
        // object is absent entirely zod reports at the parent, and a leaf-only
        // list would miss that. `hasErrorAtPath` on the parent covers both.
        fields: ["academicYearId", "academicYear", "reportingPeriod"],
    },
    {
        id: "research-papers",
        title: "Research Papers",
        description: "UGC-notified journal output.",
        icon: BookOpenText,
        sections: ["researchPapers"],
        fields: [],
    },
    {
        id: "projects",
        title: "Projects",
        description: "Institution-supported seed money projects.",
        icon: FolderKanban,
        sections: ["seedMoneyProjects"],
        fields: [],
    },
    {
        id: "awards",
        title: "Awards and Fellows",
        description: "Awards, fellowships, research fellows.",
        icon: Trophy,
        sections: ["awardsRecognition", "fellowships", "researchFellows"],
        fields: [],
    },
    {
        id: "ip-phd",
        title: "Patents and PhD",
        description: "Patents and doctoral outcomes.",
        icon: GraduationCap,
        sections: ["patents", "phdAwards"],
        fields: [],
    },
    {
        id: "knowledge-transfer",
        title: "Books and Outreach",
        description: "Books, e-content, consultancy, support, FDP.",
        icon: Layers3,
        sections: [
            "booksChapters",
            "eContentDeveloped",
            "consultancyServices",
            "financialSupport",
            "facultyDevelopmentProgrammes",
        ],
        fields: [],
    },
    {
        id: "review",
        title: "Review and Submit",
        description: "Final checks and submission.",
        icon: ClipboardCheck,
        sections: [],
        fields: [],
    },
];

/** Every form path a step owns — its own fields plus its sections' arrays. */
export function aqarStepFieldPaths(step: AqarStep): string[] {
    return [...step.fields, ...step.sections.map((key) => aqarSections[key].arrayName)];
}
