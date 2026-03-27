import { z } from "zod";

export const casStatusValues = [
    "Draft",
    "Submitted",
    "Under Review",
    "Committee Review",
    "Approved",
    "Rejected",
] as const;

const publicationSchema = z.object({
    title: z.string().trim().min(2, "Publication title is required."),
    journal: z.string().trim().min(2, "Journal name is required."),
    year: z.coerce.number().int().min(1900).max(2100),
    issn: z.string().trim().optional(),
    indexing: z.string().trim().optional(),
});

const bookSchema = z.object({
    title: z.string().trim().min(2, "Book title is required."),
    publisher: z.string().trim().min(2, "Publisher is required."),
    isbn: z.string().trim().optional(),
    year: z.coerce.number().int().min(1900).max(2100),
});

const researchProjectSchema = z.object({
    title: z.string().trim().min(2, "Project title is required."),
    fundingAgency: z.string().trim().min(2, "Funding agency is required."),
    amount: z.coerce.number().min(0).default(0),
    year: z.coerce.number().int().min(1900).max(2100),
});

const achievementBucketSchema = z.object({
    publications: z.array(publicationSchema).default([]),
    books: z.array(bookSchema).default([]),
    researchProjects: z.array(researchProjectSchema).default([]),
    phdGuided: z.coerce.number().min(0).default(0),
    conferences: z.coerce.number().min(0).default(0),
});

const emptyAchievementBucket: z.infer<typeof achievementBucketSchema> = {
    publications: [],
    books: [],
    researchProjects: [],
    phdGuided: 0,
    conferences: 0,
};

export const casApplicationSchema = z.object({
    applicationYear: z.string().trim().min(4, "Application year is required."),
    currentDesignation: z.string().trim().min(2, "Current designation is required."),
    applyingForDesignation: z.string().trim().min(2, "Applying designation is required."),
    eligibilityPeriod: z.object({
        fromYear: z.coerce.number().int().min(1900).max(2100),
        toYear: z.coerce.number().int().min(1900).max(2100),
    }),
    experienceYears: z.coerce.number().min(0),
    pbasReports: z.array(z.string().trim().min(1)).default([]),
    manualAchievements: achievementBucketSchema.default(emptyAchievementBucket),
});

export const casReviewSchema = z.object({
    remarks: z.string().trim().min(2, "Review remarks are required."),
    decision: z.enum(["Forward", "Recommend", "Reject"]),
    overrideReason: z.string().trim().min(5).optional(),
});

export const casApprovalSchema = z.object({
    remarks: z.string().trim().min(2, "Approval remarks are required."),
    decision: z.enum(["Approve", "Reject"]),
    overrideReason: z.string().trim().min(5).optional(),
});

export type CasApplicationInput = z.infer<typeof casApplicationSchema>;
