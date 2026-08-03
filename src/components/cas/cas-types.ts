import type { z } from "zod";

import type { getAllowedCasPromotionTargets, getDesignationProfile } from "@/lib/faculty/options";
import { casApplicationSchema } from "@/lib/cas/validators";

export type CasFormValues = z.input<typeof casApplicationSchema>;
export type CasResolvedValues = z.output<typeof casApplicationSchema>;

// `CasForm` and the three `UseFieldArrayReturn` aliases are gone: step components
// read the form from `FormProvider` context instead of taking it as a prop, and
// the field arrays are owned by `RepeatableSection`. Threading a `useFieldArray`
// return value down from the dashboard was what forced all three achievement
// editors to be separate bespoke components.

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

// `casStepTitles`, `casSteps`, and `casStepFieldPaths` moved to
// src/lib/cas/form-config.ts, where the steps gained ids, icons, and
// descriptions. The numeric ids they used here (`id: String(index)`) were what
// forced the dashboard's `hasStepErrors` to switch on the magic indices 6 and 7.

export function emptyCasAchievementBucket(): CasAchievementBucket {
    return {
        publications: [],
        books: [],
        researchProjects: [],
        phdGuided: 0,
        conferences: 0,
    };
}
