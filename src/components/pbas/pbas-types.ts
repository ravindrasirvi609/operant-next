import type { z } from "zod";

import { pbasApplicationSchema, type PbasSnapshot } from "@/lib/pbas/validators";

export type PbasFormValues = z.input<typeof pbasApplicationSchema>;

export type PbasApp = {
    _id: string;
    academicYearId?: string;
    academicYear: string;
    currentDesignation: PbasFormValues["currentDesignation"];
    appraisalPeriod: {
        fromDate: string;
        toDate: string;
    };
    apiScore: {
        teachingActivities: number;
        researchAcademicContribution: number;
        institutionalResponsibilities: number;
        totalScore: number;
    };
    snapshot?: PbasSnapshot;
    status: string;
    statusLogs: Array<{
        _id?: string;
        status: string;
        actorName?: string;
        actorRole?: string;
        remarks?: string;
        changedAt: string;
    }>;
    updatedAt: string;
};

export type PbasDraftReferences = {
    teachingSummaryId?: string;
    teachingLoadIds: string[];
    resultSummaryIds: string[];
    publicationIds: string[];
    bookIds: string[];
    patentIds: string[];
    researchProjectIds: string[];
    eventParticipationIds: string[];
    fdpIds: string[];
    moocCourseIds: string[];
    econtentIds: string[];
    phdGuidanceIds: string[];
    awardIds: string[];
    consultancyIds: string[];
    adminRoleIds: string[];
    institutionalContributionIds: string[];
    socialExtensionIds: string[];
};

export type PbasCandidateOption = {
    id: string;
    label: string;
    sublabel?: string;
    note?: string;
};

export type PbasReferenceKey = keyof Omit<PbasDraftReferences, "teachingSummaryId"> | "teachingSummaryId";

export type PbasSourceRow = {
    id: string;
    sourceType: string;
    title: string;
    subtitle?: string;
    note?: string;
    included: boolean;
    referenceKey?: PbasReferenceKey;
    removable?: boolean;
    sourceHref: string;
};

export type PbasSourceStep = "teaching" | "research" | "institutional";

export type PbasSourceGroup = {
    title: string;
    description?: string;
    rows: PbasSourceRow[];
};

export type PbasSourceStepConfig = {
    label: string;
    description: string;
    groups: PbasSourceGroup[];
};

export type PbasSourceTables = Record<PbasSourceStep, PbasSourceStepConfig>;

export type PbasCandidatePools = {
    category1: {
        teachingSummary?: PbasCandidateOption;
        teachingLoads: PbasCandidateOption[];
        resultSummaries: PbasCandidateOption[];
    };
    category2: {
        researchPapers: PbasCandidateOption[];
        books: PbasCandidateOption[];
        patents: PbasCandidateOption[];
        conferences: PbasCandidateOption[];
        projects: PbasCandidateOption[];
        moocCourses: PbasCandidateOption[];
        econtentItems: PbasCandidateOption[];
        phdGuidance: PbasCandidateOption[];
        awards: PbasCandidateOption[];
        consultancies: PbasCandidateOption[];
    };
    category3: {
        committees: PbasCandidateOption[];
        administrativeDuties: PbasCandidateOption[];
        examDuties: PbasCandidateOption[];
        studentGuidance: PbasCandidateOption[];
        extensionActivities: PbasCandidateOption[];
        fdps: PbasCandidateOption[];
    };
};

export type PbasRevisionSummary = {
    _id: string;
    revisionNumber: number;
    submittedAt: string;
    approvedAt?: string;
    backfillIntegrity?: string;
    migrationSource?: string;
    createdFromStatus: string;
    apiScore: PbasApp["apiScore"];
};

export type PbasDetail = PbasApp & {
    draftReferences: PbasDraftReferences;
    candidates: PbasCandidatePools;
    draftSnapshot: PbasSnapshot;
    activeRevision?: {
        _id: string;
        revisionNumber: number;
        submittedAt: string;
        approvedAt?: string;
        backfillIntegrity?: string;
        migrationSource?: string;
        createdFromStatus: string;
        apiScore: PbasApp["apiScore"];
        snapshot: PbasSnapshot;
        draftReferences: PbasDraftReferences;
    } | null;
    revisionHistory: PbasRevisionSummary[];
};

export type PbasSummary = {
    activeYear?: { id: string; label: string; yearStart: number; yearEnd: number };
    academicYearOptions: Array<{ id: string; label: string; isActive: boolean }>;
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
    meta: PbasFormValues;
    snapshot: PbasSnapshot;
    apiScore: {
        teachingActivities: number;
        researchAcademicContribution: number;
        institutionalResponsibilities: number;
        totalScore: number;
    };
    scoringWeights: {
        caps: {
            teachingActivities: number;
            researchAcademicContribution: number;
            institutionalResponsibilities: number;
        };
        category1: {
            classesTaken: number;
            coursePreparationHours: number;
            coursesTaught: number;
            mentoringCount: number;
            labSupervisionCount: number;
        };
        category2: {
            researchPaperHigh: number;
            researchPaperMedium: number;
            researchPaperDefault: number;
            book: number;
            patentGranted: number;
            patentPublished: number;
            patentDefault: number;
            conferenceInternational: number;
            conferenceNational: number;
            conferenceDefault: number;
            projectLargeAmount: number;
            projectMediumAmount: number;
            projectLarge: number;
            projectMedium: number;
            projectDefault: number;
        };
        category3: {
            committee: number;
            administrativeDuty: number;
            examDuty: number;
            studentGuidancePerUnit: number;
            studentGuidanceMaxPerEntry: number;
            extensionActivity: number;
        };
    };
};

export type IndicatorEntry = {
    indicatorId: string;
    indicatorCode: string;
    indicatorName: string;
    category?: { id?: string; code?: string; name?: string; maxScore?: number };
    maxScore: number;
    claimedScore: number;
    approvedScore?: number;
    evidenceDocument?: { _id?: string; fileName?: string; fileUrl?: string; fileType?: string } | null;
    remarks?: string;
};
