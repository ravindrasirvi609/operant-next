import { z } from "zod";

const optionalDate = z.string().trim().optional();
const optionalId = z.string().trim().optional();
const requiredString = (label: string) =>
    z.string().trim().min(1, `${label} is required.`);

// ── Academic Record ──────────────────────────────────────────────
export const academicRecordSchema = z.object({
    semesterId: z.string().trim().min(1, "Semester is required."),
    sgpa: z.coerce.number().min(0).max(10).optional(),
    cgpa: z.coerce.number().min(0).max(10).optional(),
    percentage: z.coerce.number().min(0).max(100).optional(),
    rank: z.coerce.number().int().min(1).optional(),
    resultStatus: z.enum(["Pass", "Fail", "Promoted", "Withheld"]).optional(),
});

// ── Publication ──────────────────────────────────────────────────
export const publicationSchema = z.object({
    title: requiredString("Title"),
    journalName: z.string().trim().optional(),
    publisher: z.string().trim().optional(),
    publicationType: z.enum(["Journal", "Conference", "Book"]).optional(),
    publicationDate: optionalDate,
    doi: z.string().trim().optional(),
    indexedIn: z.string().trim().optional(),
    documentId: optionalId,
});

// ── Research Project ─────────────────────────────────────────────
export const researchProjectSchema = z.object({
    title: requiredString("Title"),
    guideName: z.string().trim().optional(),
    startDate: optionalDate,
    endDate: optionalDate,
    status: z.enum(["Planned", "Ongoing", "Completed"]).optional(),
    description: z.string().trim().optional(),
    documentId: optionalId,
});

// ── Award ────────────────────────────────────────────────────────
export const awardSchema = z
    .object({
        awardId: optionalId,
        awardTitle: z.string().trim().optional(),
        category: z.string().trim().optional(),
        organizingBody: z.string().trim().optional(),
        level: z.enum(["College", "State", "National", "International"]).optional(),
        awardDate: optionalDate,
        documentId: optionalId,
    })
    .superRefine((value, ctx) => {
        if (!value.awardId && !value.awardTitle) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["awardId"],
                message: "Select an award from the master list.",
            });
        }
    });

// ── Skill ────────────────────────────────────────────────────────
export const skillSchema = z
    .object({
        skillId: optionalId,
        skillName: z.string().trim().optional(),
        category: z.enum(["Technical", "SoftSkill", "Domain", "Language", "Other"]).optional(),
        provider: z.string().trim().optional(),
        startDate: optionalDate,
        endDate: optionalDate,
        documentId: optionalId,
    })
    .superRefine((value, ctx) => {
        if (!value.skillId && !value.skillName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["skillId"],
                message: "Select a skill from the master list.",
            });
        }
    });

// ── Sport ────────────────────────────────────────────────────────
export const sportSchema = z
    .object({
        sportId: optionalId,
        sportName: z.string().trim().optional(),
        eventName: requiredString("Event name"),
        level: z.enum(["College", "State", "National", "International"]).optional(),
        position: z.string().trim().optional(),
        eventDate: optionalDate,
        documentId: optionalId,
    })
    .superRefine((value, ctx) => {
        if (!value.sportId && !value.sportName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["sportId"],
                message: "Select a sport from the master list.",
            });
        }
    });

// ── Cultural Participation ───────────────────────────────────────
export const culturalSchema = z
    .object({
        activityId: optionalId,
        activityName: z.string().trim().optional(),
        activityCategory: z.string().trim().optional(),
        eventName: requiredString("Event name"),
        level: z.string().trim().optional(),
        position: z.string().trim().optional(),
        date: optionalDate,
        documentId: optionalId,
    })
    .superRefine((value, ctx) => {
        if (!value.activityId && !value.activityName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["activityId"],
                message: "Select a cultural activity from the master list.",
            });
        }
    });

// ── Event Participation ──────────────────────────────────────────
export const eventParticipationSchema = z
    .object({
        eventId: optionalId,
        eventTitle: z.string().trim().optional(),
        eventType: z
            .enum(["Seminar", "Workshop", "Conference", "Symposium", "Webinar", "Other"])
            .optional(),
        organizedBy: z.string().trim().optional(),
        role: z.enum(["Participant", "Presenter"]),
        paperTitle: z.string().trim().optional(),
        eventDate: optionalDate,
        documentId: optionalId,
    })
    .superRefine((value, ctx) => {
        if (!value.eventId && !value.eventTitle) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["eventId"],
                message: "Select an event from the master list.",
            });
        }
    });

// ── Social Participation ─────────────────────────────────────────
export const socialParticipationSchema = z
    .object({
        programId: optionalId,
        programName: z.string().trim().optional(),
        programType: z.enum(["NSS", "NCC", "Social", "Extension", "Other"]).optional(),
        activityName: requiredString("Activity name"),
        hoursContributed: z.coerce.number().min(0).optional(),
        date: optionalDate,
        documentId: optionalId,
    })
    .superRefine((value, ctx) => {
        if (!value.programId && !value.programName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["programId"],
                message: "Select a social program from the master list.",
            });
        }
    });

// ── Placement ────────────────────────────────────────────────────
export const placementSchema = z.object({
    companyName: requiredString("Company name"),
    jobRole: z.string().trim().optional(),
    package: z.coerce.number().min(0).optional(),
    offerDate: optionalDate,
    joiningDate: optionalDate,
});

// ── Internship (model-level) ─────────────────────────────────────
export const internshipRecordSchema = z.object({
    companyName: requiredString("Company name"),
    role: z.string().trim().optional(),
    startDate: optionalDate,
    endDate: optionalDate,
    stipend: z.coerce.number().min(0).optional(),
    documentId: optionalId,
});

// ── Union type for API dispatch ──────────────────────────────────
export const RECORD_TYPES = [
    "academic",
    "publication",
    "research",
    "award",
    "skill",
    "sport",
    "cultural",
    "event",
    "social",
    "placement",
    "internship",
] as const;

export type RecordType = (typeof RECORD_TYPES)[number];

export const recordTypeSchema = z.enum(RECORD_TYPES);

export const recordSchemaMap = {
    academic: academicRecordSchema,
    publication: publicationSchema,
    research: researchProjectSchema,
    award: awardSchema,
    skill: skillSchema,
    sport: sportSchema,
    cultural: culturalSchema,
    event: eventParticipationSchema,
    social: socialParticipationSchema,
    placement: placementSchema,
    internship: internshipRecordSchema,
} as const;
