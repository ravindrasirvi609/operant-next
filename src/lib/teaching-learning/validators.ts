import { z } from "zod";

import {
    teachingLearningPlanStatusValues,
    teachingLearningDeliveryTypeValues,
} from "@/models/academic/teaching-learning-plan";
import {
    teachingLearningWorkflowStatusValues,
} from "@/models/academic/teaching-learning-assignment";
import {
    teachingLearningSessionMethodValues,
} from "@/models/academic/teaching-learning-session";
import {
    teachingLearningAssessmentTypeValues,
} from "@/models/academic/teaching-learning-assessment";
import {
    teachingLearningSupportTypeValues,
} from "@/models/academic/teaching-learning-support";

const objectIdSchema = z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{24}$/, "Invalid identifier.");

const optionalObjectIdSchema = z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^[a-fA-F0-9]{24}$/.test(value), "Invalid identifier.");

const optionalDateStringSchema = z.string().trim().optional();

export const teachingLearningPlanSchema = z.object({
    academicYearId: objectIdSchema,
    programId: objectIdSchema,
    courseId: objectIdSchema,
    semesterId: objectIdSchema,
    title: z.string().trim().min(3, "Plan title is required."),
    sectionName: z.string().trim().optional(),
    deliveryType: z.enum(teachingLearningDeliveryTypeValues).default("Theory"),
    plannedSessions: z.coerce.number().int().min(0).default(0),
    plannedContactHours: z.coerce.number().min(0).default(0),
    classStrength: z.coerce.number().int().min(0).optional(),
    summary: z.string().trim().optional(),
    facultyOwnerUserId: optionalObjectIdSchema,
    status: z.enum(teachingLearningPlanStatusValues).default("Draft"),
});

export const teachingLearningPlanUpdateSchema = teachingLearningPlanSchema.partial();

export const teachingLearningAssignmentSchema = z.object({
    planId: objectIdSchema,
    assigneeUserId: objectIdSchema,
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().default(true),
});

export const teachingLearningAssignmentUpdateSchema = z.object({
    assigneeUserId: objectIdSchema.optional(),
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().optional(),
});

export const teachingLearningSessionDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    sessionNumber: z.coerce.number().int().min(1),
    moduleTitle: z.string().trim().optional(),
    topic: z.string().trim().min(2, "Session topic is required."),
    plannedDate: optionalDateStringSchema,
    deliveredDate: optionalDateStringSchema,
    teachingMethod: z.enum(teachingLearningSessionMethodValues).default("Lecture"),
    ictTool: z.string().trim().optional(),
    attendancePercent: z.coerce.number().min(0).max(100).optional(),
    learningOutcome: z.string().trim().optional(),
    reflectionNotes: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    isDelivered: z.boolean().default(false),
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const teachingLearningAssessmentDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    title: z.string().trim().min(2, "Assessment title is required."),
    assessmentType: z.enum(teachingLearningAssessmentTypeValues).default("Assignment"),
    weightage: z.coerce.number().min(0).default(0),
    scheduledDate: optionalDateStringSchema,
    evaluatedDate: optionalDateStringSchema,
    coMappingCodes: z.array(z.string().trim().min(1)).default([]),
    maxMarks: z.coerce.number().min(0).optional(),
    averageMarks: z.coerce.number().min(0).optional(),
    attainmentPercentage: z.coerce.number().min(0).max(100).optional(),
    remarks: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    isCompleted: z.boolean().default(false),
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const teachingLearningSupportDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    title: z.string().trim().min(2, "Support activity title is required."),
    supportType: z.enum(teachingLearningSupportTypeValues).default("Remedial"),
    targetGroup: z.string().trim().optional(),
    interventionDate: optionalDateStringSchema,
    participantCount: z.coerce.number().int().min(0).optional(),
    outcomeSummary: z.string().trim().optional(),
    followUpAction: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const teachingLearningContributionDraftSchema = z.object({
    pedagogicalApproach: z.string().trim().optional(),
    learnerCentricPractices: z.string().trim().optional(),
    digitalResources: z.string().trim().optional(),
    attendanceStrategy: z.string().trim().optional(),
    feedbackAnalysis: z.string().trim().optional(),
    attainmentSummary: z.string().trim().optional(),
    actionTaken: z.string().trim().optional(),
    innovationHighlights: z.string().trim().optional(),
    supportingLinks: z.array(z.string().trim().url("Invalid URL.")).default([]),
    lessonPlanDocumentId: optionalObjectIdSchema,
    questionPaperDocumentId: optionalObjectIdSchema,
    resultAnalysisDocumentId: optionalObjectIdSchema,
    documentIds: z.array(objectIdSchema).default([]),
    contributorRemarks: z.string().trim().optional(),
    sessions: z.array(teachingLearningSessionDraftSchema).default([]),
    assessments: z.array(teachingLearningAssessmentDraftSchema).default([]),
    supports: z.array(teachingLearningSupportDraftSchema).default([]),
});

export const teachingLearningReviewSchema = z.object({
    remarks: z.string().trim().min(2, "Review remarks are required."),
    decision: z.enum(["Forward", "Recommend", "Approve", "Reject"]),
});

export type TeachingLearningPlanInput = z.output<typeof teachingLearningPlanSchema>;
export type TeachingLearningAssignmentInput = z.output<typeof teachingLearningAssignmentSchema>;
export type TeachingLearningContributionDraftInput = z.output<
    typeof teachingLearningContributionDraftSchema
>;
export type TeachingLearningReviewInput = z.output<typeof teachingLearningReviewSchema>;

export { teachingLearningWorkflowStatusValues };
