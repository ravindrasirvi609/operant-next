import { z } from "zod";

import {
    researchInnovationPlanStatusValues,
    researchInnovationPlanScopeValues,
    researchInnovationFocusAreaValues,
} from "@/models/research/research-innovation-plan";
import { researchInnovationWorkflowStatusValues } from "@/models/research/research-innovation-assignment";
import {
    researchInnovationActivityStageValues,
    researchInnovationActivityTypeValues,
} from "@/models/research/research-innovation-activity";
import {
    researchInnovationGrantStageValues,
    researchInnovationGrantTypeValues,
} from "@/models/research/research-innovation-grant";
import {
    researchInnovationStartupStageValues,
    researchInnovationStartupSupportTypeValues,
} from "@/models/research/research-innovation-startup";

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

const researchInnovationPlanBaseSchema = z.object({
    academicYearId: objectIdSchema,
    scopeType: z.enum(researchInnovationPlanScopeValues).default("Department"),
    institutionId: optionalObjectIdSchema,
    departmentId: optionalObjectIdSchema,
    title: z.string().trim().min(3, "Plan title is required."),
    focusArea: z.enum(researchInnovationFocusAreaValues).default("Integrated"),
    summary: z.string().trim().optional(),
    strategyGoals: z.string().trim().optional(),
    targetPublicationCount: z.coerce.number().int().min(0).default(0),
    targetProjectCount: z.coerce.number().int().min(0).default(0),
    targetPatentCount: z.coerce.number().int().min(0).default(0),
    targetConsultancyCount: z.coerce.number().int().min(0).default(0),
    targetStudentResearchCount: z.coerce.number().int().min(0).default(0),
    targetInnovationActivityCount: z.coerce.number().int().min(0).default(0),
    facultyOwnerUserId: optionalObjectIdSchema,
    status: z.enum(researchInnovationPlanStatusValues).default("Draft"),
});

function refineResearchInnovationPlan(
    value: {
        scopeType?: "Department" | "Institution";
        institutionId?: string;
        departmentId?: string;
    },
    ctx: z.RefinementCtx
) {
    if (value.scopeType === "Department" && !value.departmentId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["departmentId"],
            message: "Department is required for department scope.",
        });
    }

    if (value.scopeType === "Institution" && !value.institutionId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["institutionId"],
            message: "Institution is required for institution scope.",
        });
    }
}

export const researchInnovationPlanSchema = researchInnovationPlanBaseSchema.superRefine(
    (value, ctx) => {
        refineResearchInnovationPlan(value, ctx);
    }
);

export const researchInnovationPlanUpdateSchema =
    researchInnovationPlanBaseSchema.partial().superRefine((value, ctx) => {
        refineResearchInnovationPlan(value, ctx);
    });

export const researchInnovationAssignmentSchema = z.object({
    planId: objectIdSchema,
    assigneeUserId: objectIdSchema,
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().default(true),
});

export const researchInnovationAssignmentUpdateSchema = z.object({
    assigneeUserId: objectIdSchema.optional(),
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().optional(),
});

export const researchInnovationActivityDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    activityType: z.enum(researchInnovationActivityTypeValues).default("Incubation"),
    title: z.string().trim().min(2, "Activity title is required."),
    leadName: z.string().trim().optional(),
    partnerName: z.string().trim().optional(),
    startDate: optionalDateStringSchema,
    endDate: optionalDateStringSchema,
    participantCount: z.coerce.number().int().min(0).optional(),
    fundingAmount: z.coerce.number().min(0).optional(),
    stage: z.enum(researchInnovationActivityStageValues).default("Ongoing"),
    outcomeSummary: z.string().trim().optional(),
    followUpAction: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const researchInnovationGrantDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    grantType: z.enum(researchInnovationGrantTypeValues).default("SeedFunding"),
    title: z.string().trim().min(2, "Grant title is required."),
    schemeName: z.string().trim().optional(),
    sponsorName: z.string().trim().optional(),
    beneficiaryName: z.string().trim().optional(),
    sanctionedAmount: z.coerce.number().min(0).optional(),
    releasedAmount: z.coerce.number().min(0).optional(),
    awardDate: optionalDateStringSchema,
    stage: z.enum(researchInnovationGrantStageValues).default("Proposed"),
    outcomeSummary: z.string().trim().optional(),
    followUpAction: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const researchInnovationStartupDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    startupName: z.string().trim().min(2, "Startup or incubatee name is required."),
    supportType: z.enum(researchInnovationStartupSupportTypeValues).default("Incubation"),
    stage: z.enum(researchInnovationStartupStageValues).default("Ideation"),
    founderNames: z.string().trim().optional(),
    sector: z.string().trim().optional(),
    incubationCell: z.string().trim().optional(),
    registrationNumber: z.string().trim().optional(),
    supportStartDate: optionalDateStringSchema,
    supportEndDate: optionalDateStringSchema,
    fundingAmount: z.coerce.number().min(0).optional(),
    outcomeSummary: z.string().trim().optional(),
    followUpAction: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const researchInnovationContributionDraftSchema = z.object({
    researchStrategy: z.string().trim().optional(),
    fundingPipeline: z.string().trim().optional(),
    publicationQualityPractices: z.string().trim().optional(),
    innovationEcosystem: z.string().trim().optional(),
    incubationSupport: z.string().trim().optional(),
    consultancyTranslation: z.string().trim().optional(),
    iprCommercialization: z.string().trim().optional(),
    studentResearchEngagement: z.string().trim().optional(),
    collaborationHighlights: z.string().trim().optional(),
    ethicsAndCompliance: z.string().trim().optional(),
    facultyPublicationIds: z.array(objectIdSchema).default([]),
    facultyPatentIds: z.array(objectIdSchema).default([]),
    facultyResearchProjectIds: z.array(objectIdSchema).default([]),
    facultyConsultancyIds: z.array(objectIdSchema).default([]),
    researchPublicationIds: z.array(objectIdSchema).default([]),
    researchProjectIds: z.array(objectIdSchema).default([]),
    intellectualPropertyIds: z.array(objectIdSchema).default([]),
    researchActivityIds: z.array(objectIdSchema).default([]),
    studentPublicationIds: z.array(objectIdSchema).default([]),
    studentResearchProjectIds: z.array(objectIdSchema).default([]),
    supportingLinks: z.array(z.string().trim().url("Invalid URL.")).default([]),
    documentIds: z.array(objectIdSchema).default([]),
    contributorRemarks: z.string().trim().optional(),
    activities: z.array(researchInnovationActivityDraftSchema).default([]),
    grants: z.array(researchInnovationGrantDraftSchema).default([]),
    startups: z.array(researchInnovationStartupDraftSchema).default([]),
});

export const researchInnovationReviewSchema = z.object({
    remarks: z.string().trim().min(2, "Review remarks are required."),
    decision: z.enum(["Forward", "Recommend", "Approve", "Reject"]),
});

export type ResearchInnovationPlanInput = z.output<
    typeof researchInnovationPlanSchema
>;
export type ResearchInnovationAssignmentInput = z.output<
    typeof researchInnovationAssignmentSchema
>;
export type ResearchInnovationContributionDraftInput = z.output<
    typeof researchInnovationContributionDraftSchema
>;
export type ResearchInnovationReviewInput = z.output<
    typeof researchInnovationReviewSchema
>;

export { researchInnovationWorkflowStatusValues };
