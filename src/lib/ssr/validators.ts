import { z } from "zod";

import {
    ssrContributorRoleValues,
    ssrEvidenceModeValues,
    ssrMetricDataTypeValues,
    ssrMetricTypeValues,
    ssrOwnershipScopeValues,
} from "@/models/reporting/ssr-metric";
import { ssrCycleStatusValues, type SsrCycleStatus } from "@/models/reporting/ssr-cycle";
import { ssrWorkflowStatusValues } from "@/models/reporting/ssr-assignment";

const objectIdSchema = z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{24}$/, "Invalid identifier.");

const optionalObjectIdSchema = z.string().trim().optional().refine(
    (value) => !value || /^[a-fA-F0-9]{24}$/.test(value),
    "Invalid identifier."
);

const optionalDateStringSchema = z.string().trim().optional();

export const ssrCycleSchema = z.object({
    institutionId: optionalObjectIdSchema,
    academicYearId: optionalObjectIdSchema,
    title: z.string().trim().min(3, "Cycle title is required."),
    code: z.string().trim().min(2, "Cycle code is required.").max(24),
    framework: z.string().trim().min(2).default("NAAC_SSR"),
    description: z.string().trim().optional(),
    status: z.enum(ssrCycleStatusValues).default("Draft"),
    submissionWindowStart: optionalDateStringSchema,
    submissionWindowEnd: optionalDateStringSchema,
});

export const ssrCycleUpdateSchema = ssrCycleSchema.partial();

export const ssrCriterionSchema = z.object({
    cycleId: objectIdSchema,
    criterionCode: z.string().trim().min(1, "Criterion code is required."),
    title: z.string().trim().min(3, "Criterion title is required."),
    description: z.string().trim().optional(),
    weightage: z.coerce.number().min(0).optional(),
    displayOrder: z.coerce.number().int().min(1).default(1),
    isActive: z.boolean().default(true),
});

export const ssrCriterionUpdateSchema = ssrCriterionSchema.partial();

export const ssrMetricSchema = z.object({
    cycleId: objectIdSchema,
    criterionId: objectIdSchema,
    metricCode: z.string().trim().min(1, "Metric code is required."),
    title: z.string().trim().min(3, "Metric title is required."),
    description: z.string().trim().optional(),
    instructions: z.string().trim().optional(),
    metricType: z.enum(ssrMetricTypeValues).default("Quantitative"),
    dataType: z.enum(ssrMetricDataTypeValues).default("Narrative"),
    ownershipScope: z.enum(ssrOwnershipScopeValues).default("Department"),
    sourceModule: z.string().trim().optional(),
    benchmarkValue: z.string().trim().optional(),
    unitLabel: z.string().trim().optional(),
    evidenceMode: z.enum(ssrEvidenceModeValues).default("Optional"),
    allowedContributorRoles: z.array(z.enum(ssrContributorRoleValues)).min(1).default(["Faculty"]),
    displayOrder: z.coerce.number().int().min(1).default(1),
    isActive: z.boolean().default(true),
});

export const ssrMetricUpdateSchema = ssrMetricSchema.partial();

export const ssrNarrativeSectionSchema = z.object({
    cycleId: objectIdSchema,
    criterionId: objectIdSchema,
    metricId: objectIdSchema,
    sectionKey: z.string().trim().min(1, "Section key is required."),
    title: z.string().trim().min(3, "Section title is required."),
    prompt: z.string().trim().min(5, "Section prompt is required."),
    guidance: z.string().trim().optional(),
    wordLimitMin: z.coerce.number().int().min(0).optional(),
    wordLimitMax: z.coerce.number().int().min(0).optional(),
    displayOrder: z.coerce.number().int().min(1).default(1),
    isActive: z.boolean().default(true),
});

export const ssrNarrativeSectionUpdateSchema = ssrNarrativeSectionSchema.partial();

export const ssrAssignmentSchema = z.object({
    cycleId: objectIdSchema,
    criterionId: objectIdSchema,
    metricId: objectIdSchema,
    sectionId: optionalObjectIdSchema,
    assigneeUserId: objectIdSchema,
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().default(true),
});

export const ssrAssignmentUpdateSchema = z.object({
    cycleId: objectIdSchema.optional(),
    criterionId: objectIdSchema.optional(),
    metricId: objectIdSchema.optional(),
    sectionId: optionalObjectIdSchema,
    assigneeUserId: objectIdSchema.optional(),
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().optional(),
});

export const ssrResponseDraftSchema = z.object({
    narrativeResponse: z.string().trim().optional(),
    metricValueNumeric: z.coerce.number().optional(),
    metricValueText: z.string().trim().optional(),
    metricValueBoolean: z.boolean().optional(),
    metricValueDate: optionalDateStringSchema,
    tableData: z.record(z.string(), z.unknown()).optional(),
    supportingLinks: z.array(z.string().trim().url("Invalid URL.")).default([]),
    documentIds: z.array(objectIdSchema).default([]),
    contributorRemarks: z.string().trim().optional(),
});

export const ssrReviewSchema = z.object({
    remarks: z.string().trim().min(2, "Review remarks are required."),
    decision: z.enum(["Forward", "Recommend", "Approve", "Reject"]),
});

export type SsrCycleInput = z.output<typeof ssrCycleSchema>;
export type SsrCriterionInput = z.output<typeof ssrCriterionSchema>;
export type SsrMetricInput = z.output<typeof ssrMetricSchema>;
export type SsrNarrativeSectionInput = z.output<typeof ssrNarrativeSectionSchema>;
export type SsrAssignmentInput = z.output<typeof ssrAssignmentSchema>;
export type SsrResponseDraftInput = z.output<typeof ssrResponseDraftSchema>;
export type SsrReviewInput = z.output<typeof ssrReviewSchema>;
export type SsrWorkflowStatus = (typeof ssrWorkflowStatusValues)[number];
export type SsrCycleStatusInput = SsrCycleStatus;
