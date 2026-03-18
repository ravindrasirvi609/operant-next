export const facultyEmploymentTypes = ["Permanent", "AdHoc", "Guest"] as const;

export const publicationTypes = ["Scopus", "UGC", "WebOfScience", "Book"] as const;
export const publicationAuthorPositions = [
    "First",
    "Second",
    "Corresponding",
    "CoAuthor",
    "Other",
] as const;

export const bookTypes = ["Textbook", "Reference", "Chapter"] as const;
export const patentStatuses = ["Filed", "Published", "Granted"] as const;
export const researchProjectTypes = ["Minor", "Major", "Industry"] as const;
export const researchProjectStatuses = ["Planned", "Ongoing", "Completed", "Closed"] as const;
export const eventTypes = ["Seminar", "Workshop", "Conference", "Symposium", "Webinar", "Other"] as const;
export const eventLevels = ["College", "State", "National", "International"] as const;
export const eventRoles = ["Participant", "ResourcePerson", "Chair"] as const;
export const institutionalImpactLevels = ["dept", "institute", "university"] as const;
export const facultyProgrammeLevels = ["College", "State", "National", "International"] as const;

export const designationOptions = [
    "Assistant Professor (Stage 1)",
    "Assistant Professor (Stage 2)",
    "Assistant Professor (Stage 3)",
    "Assistant Professor (Stage 4)",
    "Associate Professor",
    "Professor",
] as const;

export type FacultyDesignation = (typeof designationOptions)[number];

type DesignationProfile = {
    key: "early_assistant" | "advanced_assistant" | "associate" | "professor";
    label: string;
    pbasFocus: string;
    casFocus: string;
    showCasPhdGuided: boolean;
    showCasConferenceCount: boolean;
};

const designationProfiles: Record<FacultyDesignation, DesignationProfile> = {
    "Assistant Professor (Stage 1)": {
        key: "early_assistant",
        label: "Assistant Professor Stage 1",
        pbasFocus: "Teaching evidence and early research outputs should be kept current for yearly PBAS filing.",
        casFocus: "CAS is primarily driven by approved PBAS history, publications, books, projects, and conference contributions.",
        showCasPhdGuided: false,
        showCasConferenceCount: true,
    },
    "Assistant Professor (Stage 2)": {
        key: "early_assistant",
        label: "Assistant Professor Stage 2",
        pbasFocus: "Teaching evidence and steady research output remain the primary PBAS focus at this stage.",
        casFocus: "Promotion readiness depends on approved PBAS plus publication, book, project, and conference evidence.",
        showCasPhdGuided: false,
        showCasConferenceCount: true,
    },
    "Assistant Professor (Stage 3)": {
        key: "advanced_assistant",
        label: "Assistant Professor Stage 3",
        pbasFocus: "PBAS should show strong research growth along with teaching and institutional responsibilities.",
        casFocus: "Advanced assistant promotion paths emphasize strong PBAS, research growth, and broader academic contribution.",
        showCasPhdGuided: true,
        showCasConferenceCount: true,
    },
    "Assistant Professor (Stage 4)": {
        key: "advanced_assistant",
        label: "Assistant Professor Stage 4",
        pbasFocus: "PBAS should demonstrate mature research activity, institutional contribution, and sustained teaching quality.",
        casFocus: "Senior assistant promotion paths can include doctoral guidance and stronger institutional contribution evidence.",
        showCasPhdGuided: true,
        showCasConferenceCount: true,
    },
    "Associate Professor": {
        key: "associate",
        label: "Associate Professor",
        pbasFocus: "PBAS should emphasize leadership, doctoral guidance, research depth, and institutional responsibility.",
        casFocus: "Associate-level CAS paths rely heavily on approved PBAS, doctoral guidance, and high-value scholarly output.",
        showCasPhdGuided: true,
        showCasConferenceCount: true,
    },
    Professor: {
        key: "professor",
        label: "Professor",
        pbasFocus: "PBAS should highlight research leadership, mentoring, academic stewardship, and institutional impact.",
        casFocus: "Professor-level review is leadership-heavy and depends on strong PBAS, doctoral guidance, and institutional contribution.",
        showCasPhdGuided: true,
        showCasConferenceCount: false,
    },
};

export function getDesignationProfile(designation?: string | null): DesignationProfile {
    return designationProfiles[(designation as FacultyDesignation) ?? "Assistant Professor (Stage 1)"] ??
        designationProfiles["Assistant Professor (Stage 1)"];
}

export function getAllowedCasPromotionTargets(currentDesignation?: string | null): FacultyDesignation[] {
    switch (currentDesignation) {
        case "Assistant Professor (Stage 1)":
            return ["Assistant Professor (Stage 2)"];
        case "Assistant Professor (Stage 2)":
            return ["Assistant Professor (Stage 3)"];
        case "Assistant Professor (Stage 3)":
            return ["Assistant Professor (Stage 4)", "Associate Professor"];
        case "Assistant Professor (Stage 4)":
            return ["Associate Professor"];
        case "Associate Professor":
            return ["Professor"];
        case "Professor":
            return ["Professor"];
        default:
            return ["Assistant Professor (Stage 2)"];
    }
}

export function getDefaultCasTarget(currentDesignation?: string | null): FacultyDesignation {
    return getAllowedCasPromotionTargets(currentDesignation)[0];
}
