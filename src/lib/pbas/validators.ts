import { z } from "zod";

export const pbasStatusValues = [
    "Draft",
    "Submitted",
    "Under Review",
    "Committee Review",
    "Approved",
    "Rejected",
] as const;

const researchPaperSchema = z.object({
    title: z.string().trim().min(2, "Paper title is required."),
    journal: z.string().trim().min(2, "Journal name is required."),
    year: z.coerce.number().int().min(1900).max(2100),
    issn: z.string().trim().optional(),
    indexing: z.string().trim().optional(),
    documentId: z.string().trim().optional(),
});

const bookSchema = z.object({
    title: z.string().trim().min(2, "Book title is required."),
    publisher: z.string().trim().min(2, "Publisher is required."),
    isbn: z.string().trim().optional(),
    year: z.coerce.number().int().min(1900).max(2100),
    documentId: z.string().trim().optional(),
});

const patentSchema = z.object({
    title: z.string().trim().min(2, "Patent title is required."),
    year: z.coerce.number().int().min(1900).max(2100),
    status: z.string().trim().min(2, "Patent status is required."),
    documentId: z.string().trim().optional(),
});

const conferenceSchema = z.object({
    title: z.string().trim().min(2, "Conference title is required."),
    organizer: z.string().trim().min(2, "Conference organizer is required."),
    year: z.coerce.number().int().min(1900).max(2100),
    type: z.string().trim().min(2, "Conference type is required."),
    documentId: z.string().trim().optional(),
});

const projectSchema = z.object({
    title: z.string().trim().min(2, "Project title is required."),
    fundingAgency: z.string().trim().min(2, "Funding agency is required."),
    amount: z.coerce.number().min(0).default(0),
    year: z.coerce.number().int().min(1900).max(2100),
    documentId: z.string().trim().optional(),
});

const committeeSchema = z.object({
    committeeName: z.string().trim().min(2, "Committee name is required."),
    role: z.string().trim().optional(),
    year: z.coerce.number().int().min(1900).max(2100).optional(),
    documentId: z.string().trim().optional(),
});

const administrativeDutySchema = z.object({
    title: z.string().trim().min(2, "Administrative duty title is required."),
    year: z.coerce.number().int().min(1900).max(2100).optional(),
    documentId: z.string().trim().optional(),
});

const examDutySchema = z.object({
    duty: z.string().trim().min(2, "Exam duty is required."),
    year: z.coerce.number().int().min(1900).max(2100).optional(),
    documentId: z.string().trim().optional(),
});

const studentGuidanceSchema = z.object({
    activity: z.string().trim().min(2, "Guidance activity is required."),
    count: z.coerce.number().min(0).default(0),
    documentId: z.string().trim().optional(),
});

const extensionActivitySchema = z.object({
    title: z.string().trim().min(2, "Extension activity title is required."),
    role: z.string().trim().optional(),
    year: z.coerce.number().int().min(1900).max(2100).optional(),
    documentId: z.string().trim().optional(),
});

const category1Schema = z.object({
    classesTaken: z.coerce.number().min(0).default(0),
    coursePreparationHours: z.coerce.number().min(0).default(0),
    coursesTaught: z.array(z.string().trim().min(1)).default([]),
    mentoringCount: z.coerce.number().min(0).default(0),
    labSupervisionCount: z.coerce.number().min(0).default(0),
    feedbackSummary: z.string().trim().optional(),
});

const category2Schema = z.object({
    researchPapers: z.array(researchPaperSchema).default([]),
    books: z.array(bookSchema).default([]),
    patents: z.array(patentSchema).default([]),
    conferences: z.array(conferenceSchema).default([]),
    projects: z.array(projectSchema).default([]),
});

const category3Schema = z.object({
    committees: z.array(committeeSchema).default([]),
    administrativeDuties: z.array(administrativeDutySchema).default([]),
    examDuties: z.array(examDutySchema).default([]),
    studentGuidance: z.array(studentGuidanceSchema).default([]),
    extensionActivities: z.array(extensionActivitySchema).default([]),
});

export const pbasApplicationSchema = z.object({
    academicYear: z.string().trim().min(4, "Academic year is required."),
    currentDesignation: z.string().trim().min(2, "Current designation is required."),
    appraisalPeriod: z.object({
        fromDate: z.string().trim().min(4, "Appraisal start date is required."),
        toDate: z.string().trim().min(4, "Appraisal end date is required."),
    }),
});

export const pbasDraftReferencesSchema = z.object({
    teachingSummaryId: z.string().trim().min(1).optional(),
    teachingLoadIds: z.array(z.string().trim().min(1)).default([]),
    publicationIds: z.array(z.string().trim().min(1)).default([]),
    bookIds: z.array(z.string().trim().min(1)).default([]),
    patentIds: z.array(z.string().trim().min(1)).default([]),
    researchProjectIds: z.array(z.string().trim().min(1)).default([]),
    eventParticipationIds: z.array(z.string().trim().min(1)).default([]),
    adminRoleIds: z.array(z.string().trim().min(1)).default([]),
    institutionalContributionIds: z.array(z.string().trim().min(1)).default([]),
    socialExtensionIds: z.array(z.string().trim().min(1)).default([]),
});

export const pbasSnapshotSchema = z.object({
    category1: category1Schema,
    category2: category2Schema,
    category3: category3Schema,
});

export const pbasReviewSchema = z.object({
    remarks: z.string().trim().min(2, "Review remarks are required."),
    decision: z.enum(["Forward", "Recommend", "Reject"]),
});

export const pbasApprovalSchema = z.object({
    remarks: z.string().trim().min(2, "Approval remarks are required."),
    decision: z.enum(["Approve", "Reject"]),
});

export type PbasApplicationMetaInput = z.infer<typeof pbasApplicationSchema>;
export type PbasDraftReferencesInput = z.infer<typeof pbasDraftReferencesSchema>;
export type PbasSnapshot = z.infer<typeof pbasSnapshotSchema>;
