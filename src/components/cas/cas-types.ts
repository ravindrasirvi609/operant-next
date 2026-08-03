import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";
import type { z } from "zod";

import type { getAllowedCasPromotionTargets, getDesignationProfile } from "@/lib/faculty/options";
import { casApplicationSchema } from "@/lib/cas/validators";
import type { StepDescriptor } from "@/components/ui/stepper";

export type CasFormValues = z.input<typeof casApplicationSchema>;
export type CasResolvedValues = z.output<typeof casApplicationSchema>;

export type CasForm = UseFormReturn<CasFormValues, unknown, CasResolvedValues>;

export type CasPublicationFieldArray = UseFieldArrayReturn<CasFormValues, "manualAchievements.publications">;
export type CasBookFieldArray = UseFieldArrayReturn<CasFormValues, "manualAchievements.books">;
export type CasProjectFieldArray = UseFieldArrayReturn<CasFormValues, "manualAchievements.researchProjects">;

export type CasDesignationProfile = ReturnType<typeof getDesignationProfile>;
export type CasPromotionTargets = ReturnType<typeof getAllowedCasPromotionTargets>;

export type PbasOption = {
    _id: string;
    academicYear: string;
    totalApiScore?: number;
    teachingScore?: number;
    researchScore?: number;
    institutionalScore?: number;
    status?: string;
    usableForSubmit?: boolean;
};

export type CasAchievementBucket = {
    publications: Array<{ title: string; journal: string; year: number; issn?: string; indexing?: string }>;
    books: Array<{ title: string; publisher: string; isbn?: string; year: number }>;
    researchProjects: Array<{ title: string; fundingAgency: string; amount: number; year: number }>;
    phdGuided: number;
    conferences: number;
};

export type CasApp = {
    _id: string;
    applicationYearId?: string;
    applicationYear: string;
    currentDesignation: string;
    applyingForDesignation: string;
    eligibilityPeriod: { fromYear: number; toYear: number };
    experienceYears: number;
    pbasReports: string[];
    apiScore: {
        teachingLearning: number;
        researchPublication: number;
        academicContribution: number;
        totalScore: number;
    };
    eligibility?: {
        isEligible: boolean;
        message?: string;
        minimumExperienceYears?: number;
        minimumApiScore?: number;
    };
    linkedAchievements?: CasAchievementBucket;
    manualAchievements?: CasAchievementBucket;
    committeeReviews?: Array<{
        _id?: string;
        committeeMemberName: string;
        designation: string;
        role: string;
        reviewerRole?: string;
        stage: string;
        remarks?: string;
        decision?: string;
        decisionDate?: string;
        createdAt?: string;
    }>;
    apiBreakup?: Array<{
        _id?: string;
        categoryCode: string;
        scoreObtained: number;
        minimumRequired: number;
        eligible: boolean;
    }>;
    status: string;
    statusLogs: Array<{
        _id?: string;
        status: string;
        actorName?: string;
        actorRole?: string;
        remarks?: string;
        changedAt: string;
    }>;
    submittedAt?: string;
    updatedAt: string;
};

export type CasEligibility = {
    eligible: boolean;
    reason: string;
    requiredYears?: number;
    requiredScore?: number;
    currentDesignation?: string;
    nextDesignation?: string;
    experienceYears?: number;
    lastApprovedApiScore?: number;
    lastApprovedYear?: string;
    approvedPbasCount: number;
    missingProfileFields: string[];
};

export type CasDocumentItem = {
    documentType: string;
    label: string;
    isMandatory: boolean;
    documentId?: { _id?: string; fileName?: string; fileUrl?: string; fileType?: string } | null;
    uploadedAt?: string | null;
};

export type CasWorkflowStatus = {
    moduleName?: string;
    recordId?: string;
    currentApproverRole: string;
    status: string;
    remarks?: string;
    createdAt?: string;
    updatedAt?: string;
};

export const casStepTitles = [
    "Basic Details",
    "Eligibility Period",
    "PBAS Reports",
    "Publications (Optional)",
    "Books & Projects (Optional)",
    "Academic Contributions",
    "Documents & Checklist",
    "Review and Submit",
] as const;

export const casSteps: StepDescriptor[] = casStepTitles.map((title, index) => ({
    id: String(index),
    title,
}));

/** Dot-separated RHF field paths that belong to each wizard step, used to derive per-step "Fix" state. */
export const casStepFieldPaths: Record<number, string[]> = {
    0: ["applicationYearId", "applicationYear", "currentDesignation", "applyingForDesignation"],
    1: ["eligibilityPeriod.fromYear", "eligibilityPeriod.toYear", "experienceYears"],
    2: ["pbasReports"],
    3: ["manualAchievements.publications"],
    4: ["manualAchievements.books", "manualAchievements.researchProjects"],
    5: ["manualAchievements.phdGuided", "manualAchievements.conferences"],
};

export function emptyCasAchievementBucket(): CasAchievementBucket {
    return {
        publications: [],
        books: [],
        researchProjects: [],
        phdGuided: 0,
        conferences: 0,
    };
}
