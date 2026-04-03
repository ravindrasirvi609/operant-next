import { z } from "zod";

import {
    curriculumCalendarStatusValues,
} from "@/models/academic/curriculum-academic-calendar";
import {
    curriculumCalendarEventTypeValues,
} from "@/models/academic/curriculum-academic-calendar-event";
import {
    curriculumPlanStatusValues,
} from "@/models/academic/curriculum-plan";
import {
    curriculumCourseTypeValues,
} from "@/models/academic/curriculum-course";
import {
    curriculumProgramOutcomeTypeValues,
} from "@/models/academic/curriculum-program-outcome";
import {
    curriculumBloomLevelValues,
} from "@/models/academic/curriculum-course-outcome";
import {
    curriculumBosDecisionStatusValues,
    curriculumBosDecisionTypeValues,
} from "@/models/academic/curriculum-bos-decision";
import {
    curriculumValueAddedCourseStatusValues,
} from "@/models/academic/curriculum-value-added-course";
import {
    curriculumWorkflowStatusValues,
} from "@/models/academic/curriculum-assignment";

const objectIdSchema = z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{24}$/, "Invalid identifier.");

const optionalObjectIdSchema = z.string().trim().optional().refine(
    (value) => !value || /^[a-fA-F0-9]{24}$/.test(value),
    "Invalid identifier."
);

const optionalDateStringSchema = z.string().trim().optional();

const nonEmptyString = (message: string) => z.string().trim().min(1, message);

export const curriculumCalendarSchema = z.object({
    institutionId: objectIdSchema,
    academicYearId: objectIdSchema,
    title: z.string().trim().min(3, "Calendar title is required."),
    startDate: z.string().trim().min(1, "Start date is required."),
    endDate: z.string().trim().min(1, "End date is required."),
    status: z.enum(curriculumCalendarStatusValues).default("Draft"),
});

export const curriculumCalendarUpdateSchema = curriculumCalendarSchema.partial();

export const curriculumCalendarEventSchema = z.object({
    calendarId: objectIdSchema,
    eventTitle: z.string().trim().min(3, "Event title is required."),
    eventType: z.enum(curriculumCalendarEventTypeValues).default("Other"),
    startDate: z.string().trim().min(1, "Start date is required."),
    endDate: optionalDateStringSchema,
    description: z.string().trim().optional(),
});

export const curriculumCalendarEventUpdateSchema = curriculumCalendarEventSchema.partial();

export const curriculumPlanSchema = z.object({
    programId: objectIdSchema,
    effectiveFromAcademicYearId: optionalObjectIdSchema,
    title: z.string().trim().min(3, "Curriculum title is required."),
    regulationYear: z.string().trim().min(2, "Regulation year is required."),
    totalCredits: z.coerce.number().min(0),
    status: z.enum(curriculumPlanStatusValues).default("Draft"),
    summary: z.string().trim().optional(),
});

export const curriculumPlanUpdateSchema = curriculumPlanSchema.partial();

export const curriculumCourseSchema = z.object({
    curriculumId: objectIdSchema,
    courseId: optionalObjectIdSchema,
    courseCode: z.string().trim().min(2, "Course code is required."),
    courseTitle: z.string().trim().min(3, "Course title is required."),
    courseType: z.enum(curriculumCourseTypeValues).default("Core"),
    credits: z.coerce.number().min(0),
    lectureHours: z.coerce.number().min(0).default(0),
    tutorialHours: z.coerce.number().min(0).default(0),
    practicalHours: z.coerce.number().min(0).default(0),
    semesterNumber: z.coerce.number().int().min(1),
    displayOrder: z.coerce.number().int().min(1).default(1),
    facultyOwnerUserId: optionalObjectIdSchema,
    isActive: z.boolean().default(true),
});

export const curriculumCourseUpdateSchema = curriculumCourseSchema.partial();

export const curriculumSyllabusVersionSchema = z.object({
    curriculumId: objectIdSchema,
    curriculumCourseId: objectIdSchema,
    versionNumber: z.coerce.number().int().min(1),
    revisionReason: z.string().trim().optional(),
    syllabusSummary: z.string().trim().optional(),
    unitOutline: z.string().trim().optional(),
    pedagogy: z.string().trim().optional(),
    assessmentStrategy: z.string().trim().optional(),
    referenceBooks: z.array(z.string().trim().min(1)).default([]),
    officialDocumentId: optionalObjectIdSchema,
    approvedByBosMeetingId: optionalObjectIdSchema,
    effectiveAcademicYearId: optionalObjectIdSchema,
    status: z.enum(curriculumWorkflowStatusValues).default("Draft"),
});

export const curriculumSyllabusVersionUpdateSchema = curriculumSyllabusVersionSchema.partial();

export const curriculumProgramOutcomeSchema = z.object({
    curriculumId: objectIdSchema,
    programId: objectIdSchema,
    outcomeType: z.enum(curriculumProgramOutcomeTypeValues).default("PO"),
    outcomeCode: z.string().trim().min(2, "Outcome code is required."),
    description: z.string().trim().min(5, "Outcome description is required."),
    isActive: z.boolean().default(true),
});

export const curriculumProgramOutcomeUpdateSchema = curriculumProgramOutcomeSchema.partial();

export const curriculumBosMeetingSchema = z.object({
    departmentId: objectIdSchema,
    academicYearId: optionalObjectIdSchema,
    title: z.string().trim().min(3, "Meeting title is required."),
    meetingDate: z.string().trim().min(1, "Meeting date is required."),
    agenda: z.string().trim().optional(),
    minutesDocumentId: optionalObjectIdSchema,
});

export const curriculumBosMeetingUpdateSchema = curriculumBosMeetingSchema.partial();

export const curriculumBosDecisionSchema = z.object({
    meetingId: objectIdSchema,
    curriculumId: optionalObjectIdSchema,
    curriculumCourseId: optionalObjectIdSchema,
    decisionTitle: z.string().trim().min(3, "Decision title is required."),
    decisionType: z.enum(curriculumBosDecisionTypeValues).default("Other"),
    description: z.string().trim().optional(),
    status: z.enum(curriculumBosDecisionStatusValues).default("Proposed"),
    implementedAcademicYearId: optionalObjectIdSchema,
});

export const curriculumBosDecisionUpdateSchema = curriculumBosDecisionSchema.partial();

export const curriculumValueAddedCourseSchema = z.object({
    departmentId: objectIdSchema,
    academicYearId: optionalObjectIdSchema,
    title: z.string().trim().min(3, "Course title is required."),
    courseCode: z.string().trim().optional(),
    credits: z.coerce.number().min(0).default(0),
    contactHours: z.coerce.number().min(0).default(0),
    coordinatorUserId: optionalObjectIdSchema,
    startDate: optionalDateStringSchema,
    endDate: optionalDateStringSchema,
    status: z.enum(curriculumValueAddedCourseStatusValues).default("Draft"),
    description: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
});

export const curriculumValueAddedCourseUpdateSchema = curriculumValueAddedCourseSchema.partial();

export const curriculumAssignmentSchema = z.object({
    curriculumId: objectIdSchema,
    curriculumCourseId: objectIdSchema,
    syllabusVersionId: objectIdSchema,
    assigneeUserId: objectIdSchema,
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().default(true),
});

export const curriculumAssignmentUpdateSchema = z.object({
    curriculumId: objectIdSchema.optional(),
    curriculumCourseId: objectIdSchema.optional(),
    syllabusVersionId: objectIdSchema.optional(),
    assigneeUserId: objectIdSchema.optional(),
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().optional(),
});

export const curriculumOutcomeDraftSchema = z.object({
    coCode: nonEmptyString("Course outcome code is required."),
    description: z.string().trim().min(5, "Course outcome description is required."),
    bloomLevel: z.enum(curriculumBloomLevelValues).optional(),
    targetAttainmentPercentage: z.coerce.number().min(0).max(100).optional(),
});

export const curriculumMappingDraftSchema = z.object({
    courseOutcomeCode: nonEmptyString("Mapped course outcome code is required."),
    programOutcomeId: optionalObjectIdSchema,
    programOutcomeCode: z.string().trim().optional(),
    mappingStrength: z.coerce.number().int().min(1).max(3),
});

export const curriculumContributionDraftSchema = z.object({
    revisionReason: z.string().trim().optional(),
    syllabusSummary: z.string().trim().optional(),
    unitOutline: z.string().trim().optional(),
    pedagogy: z.string().trim().optional(),
    assessmentStrategy: z.string().trim().optional(),
    referenceBooks: z.array(z.string().trim().min(1)).default([]),
    officialDocumentId: optionalObjectIdSchema,
    approvedByBosMeetingId: optionalObjectIdSchema,
    effectiveAcademicYearId: optionalObjectIdSchema,
    outcomes: z.array(curriculumOutcomeDraftSchema).default([]),
    mappings: z.array(curriculumMappingDraftSchema).default([]),
    supportingLinks: z.array(z.string().trim().url("Invalid URL.")).default([]),
    documentIds: z.array(objectIdSchema).default([]),
    contributorRemarks: z.string().trim().optional(),
});

export const curriculumReviewSchema = z.object({
    remarks: z.string().trim().min(2, "Review remarks are required."),
    decision: z.enum(["Forward", "Recommend", "Approve", "Reject"]),
});

export type CurriculumCalendarInput = z.output<typeof curriculumCalendarSchema>;
export type CurriculumCalendarEventInput = z.output<typeof curriculumCalendarEventSchema>;
export type CurriculumPlanInput = z.output<typeof curriculumPlanSchema>;
export type CurriculumCourseInput = z.output<typeof curriculumCourseSchema>;
export type CurriculumSyllabusVersionInput = z.output<typeof curriculumSyllabusVersionSchema>;
export type CurriculumProgramOutcomeInput = z.output<typeof curriculumProgramOutcomeSchema>;
export type CurriculumBosMeetingInput = z.output<typeof curriculumBosMeetingSchema>;
export type CurriculumBosDecisionInput = z.output<typeof curriculumBosDecisionSchema>;
export type CurriculumValueAddedCourseInput = z.output<typeof curriculumValueAddedCourseSchema>;
export type CurriculumAssignmentInput = z.output<typeof curriculumAssignmentSchema>;
export type CurriculumContributionDraftInput = z.output<typeof curriculumContributionDraftSchema>;
export type CurriculumReviewInput = z.output<typeof curriculumReviewSchema>;
