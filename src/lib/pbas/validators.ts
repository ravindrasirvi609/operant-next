import { z } from "zod";
import { designationOptions } from "@/lib/faculty/options";

function parseAcademicYear(value: string) {
    const match = value.trim().match(/^(\d{4})\s*-\s*(\d{2,4})$/);
    if (!match) {
        return null;
    }

    const start = Number(match[1]);
    const endValue = Number(match[2]);
    const end =
        endValue < 100
            ? Number(`${String(start).slice(0, 2)}${String(endValue).padStart(2, "0")}`)
            : endValue;

    if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) {
        return null;
    }

    return { start, end };
}

function parseDateInput(value: string) {
    const trimmed = value.trim();
    const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
        ? new Date(`${trimmed}T00:00:00.000Z`)
        : new Date(trimmed);

    return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
}

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
    academicYear: z.string().trim().min(4, "Academic year is required.").refine(
        (value) => Boolean(parseAcademicYear(value)),
        "Academic year must be in YYYY-YYYY format."
    ),
    currentDesignation: z.enum(designationOptions, { message: "Select a valid designation." }),
    appraisalPeriod: z.object({
        fromDate: z.string().trim().min(4, "Appraisal start date is required.").refine(
            (value) => Boolean(parseDateInput(value)),
            "Appraisal start date must be a valid date."
        ),
        toDate: z.string().trim().min(4, "Appraisal end date is required.").refine(
            (value) => Boolean(parseDateInput(value)),
            "Appraisal end date must be a valid date."
        ),
    }),
}).superRefine((data, ctx) => {
    const from = parseDateInput(data.appraisalPeriod.fromDate);
    const to = parseDateInput(data.appraisalPeriod.toDate);
    const year = parseAcademicYear(data.academicYear);

    if (!from || !to || !year) {
        return;
    }

    if (from > to) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["appraisalPeriod", "toDate"],
            message: "Appraisal end date must be on or after appraisal start date.",
        });
    }

    const fromYear = from.getUTCFullYear();
    const toYear = to.getUTCFullYear();

    if (fromYear < year.start || fromYear > year.end) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["appraisalPeriod", "fromDate"],
            message: "Appraisal start date must fall within the selected academic year.",
        });
    }

    if (toYear < year.start || toYear > year.end) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["appraisalPeriod", "toDate"],
            message: "Appraisal end date must fall within the selected academic year.",
        });
    }
});

export const pbasDraftReferencesSchema = z.object({
    teachingSummaryId: z.string().trim().min(1).optional(),
    teachingLoadIds: z.array(z.string().trim().min(1)).default([]),
    resultSummaryIds: z.array(z.string().trim().min(1)).default([]),
    publicationIds: z.array(z.string().trim().min(1)).default([]),
    bookIds: z.array(z.string().trim().min(1)).default([]),
    patentIds: z.array(z.string().trim().min(1)).default([]),
    researchProjectIds: z.array(z.string().trim().min(1)).default([]),
    eventParticipationIds: z.array(z.string().trim().min(1)).default([]),
    fdpIds: z.array(z.string().trim().min(1)).default([]),
    moocCourseIds: z.array(z.string().trim().min(1)).default([]),
    econtentIds: z.array(z.string().trim().min(1)).default([]),
    phdGuidanceIds: z.array(z.string().trim().min(1)).default([]),
    awardIds: z.array(z.string().trim().min(1)).default([]),
    consultancyIds: z.array(z.string().trim().min(1)).default([]),
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
    overrideReason: z.string().trim().min(5).optional(),
});

export const pbasApprovalSchema = z.object({
    remarks: z.string().trim().min(2, "Approval remarks are required."),
    decision: z.enum(["Approve", "Reject"]),
    overrideReason: z.string().trim().min(5).optional(),
});

export const pbasScoringWeightsSchema = z.object({
    caps: z.object({
        teachingActivities: z.coerce.number().min(0),
        researchAcademicContribution: z.coerce.number().min(0),
        institutionalResponsibilities: z.coerce.number().min(0),
    }),
    category1: z.object({
        classesTaken: z.coerce.number().min(0),
        coursePreparationHours: z.coerce.number().min(0),
        coursesTaught: z.coerce.number().min(0),
        mentoringCount: z.coerce.number().min(0),
        labSupervisionCount: z.coerce.number().min(0),
    }),
    category2: z.object({
        researchPaperHigh: z.coerce.number().min(0),
        researchPaperMedium: z.coerce.number().min(0),
        researchPaperDefault: z.coerce.number().min(0),
        book: z.coerce.number().min(0),
        patentGranted: z.coerce.number().min(0),
        patentPublished: z.coerce.number().min(0),
        patentDefault: z.coerce.number().min(0),
        conferenceInternational: z.coerce.number().min(0),
        conferenceNational: z.coerce.number().min(0),
        conferenceDefault: z.coerce.number().min(0),
        projectLargeAmount: z.coerce.number().min(0),
        projectMediumAmount: z.coerce.number().min(0),
        projectLarge: z.coerce.number().min(0),
        projectMedium: z.coerce.number().min(0),
        projectDefault: z.coerce.number().min(0),
    }),
    category3: z.object({
        committee: z.coerce.number().min(0),
        administrativeDuty: z.coerce.number().min(0),
        examDuty: z.coerce.number().min(0),
        studentGuidancePerUnit: z.coerce.number().min(0),
        studentGuidanceMaxPerEntry: z.coerce.number().min(0),
        extensionActivity: z.coerce.number().min(0),
    }),
    phase2: z.object({
        innovativePedagogyPoints: z.coerce.number().min(0),
        curriculumDevPerCourse: z.coerce.number().min(0),
        econtentDevelopmentPerItem: z.coerce.number().min(0),
        studentFeedbackDivisor: z.coerce.number().positive(),
        assessmentInnovationPerHighOutcome: z.coerce.number().min(0),
        researchGuidanceCompleted: z.coerce.number().min(0),
        researchGuidanceOngoing: z.coerce.number().min(0),
        consultancyPerProject: z.coerce.number().min(0),
        researchEcontentPerItem: z.coerce.number().min(0),
        moocCompletionPerCourse: z.coerce.number().min(0),
        awardsInternational: z.coerce.number().min(0),
        awardsNational: z.coerce.number().min(0),
        awardsState: z.coerce.number().min(0),
        awardsCollege: z.coerce.number().min(0),
        researchImpactHigh: z.coerce.number().min(0),
        researchImpactMedium: z.coerce.number().min(0),
        researchImpactLow: z.coerce.number().min(0),
        editorialReviewPerRole: z.coerce.number().min(0),
        fdpPerItem: z.coerce.number().min(0),
        professionalBodyPerMembership: z.coerce.number().min(0),
        communityServicePerActivity: z.coerce.number().min(0),
        outreachPerActivity: z.coerce.number().min(0),
        resourcePersonPerEvent: z.coerce.number().min(0),
        governancePerRole: z.coerce.number().min(0),
    }),
});

export const pbasScoringSettingsSchema = z.object({
    submissionDeadline: z.string().trim().optional(),
    scoringWeights: pbasScoringWeightsSchema,
});

export const pbasEntryModerationSchema = z.object({
    updates: z.array(
        z.object({
            indicatorId: z.string().trim().min(1),
            approvedScore: z.coerce.number().finite().min(0),
            remarks: z.string().trim().optional(),
        })
    ).min(1),
}).superRefine((data, ctx) => {
    const seen = new Set<string>();
    data.updates.forEach((item, index) => {
        if (seen.has(item.indicatorId)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["updates", index, "indicatorId"],
                message: "Duplicate indicator updates are not allowed in one moderation request.",
            });
        }
        seen.add(item.indicatorId);
    });
});

export type PbasApplicationMetaInput = z.infer<typeof pbasApplicationSchema>;
export type PbasDraftReferencesInput = z.infer<typeof pbasDraftReferencesSchema>;
export type PbasSnapshot = z.infer<typeof pbasSnapshotSchema>;
export type PbasScoringWeights = z.infer<typeof pbasScoringWeightsSchema>;
