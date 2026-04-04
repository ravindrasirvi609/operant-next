import { z } from "zod";

import {
    governanceLeadershipIqacPlanScopeValues,
    governanceLeadershipIqacPlanStatusValues,
    governanceLeadershipIqacFocusAreaValues,
} from "@/models/core/governance-leadership-iqac-plan";
import { governanceLeadershipIqacWorkflowStatusValues } from "@/models/core/governance-leadership-iqac-assignment";
import { governanceIqacMeetingTypeValues } from "@/models/core/governance-iqac-meeting";
import {
    governanceQualityInitiativeStatusValues,
    governanceQualityInitiativeTypeValues,
} from "@/models/core/governance-quality-initiative";
import {
    governancePolicyCircularRevisionStatusValues,
    governancePolicyCircularTypeValues,
} from "@/models/core/governance-policy-circular";
import {
    governanceComplianceReviewStatusValues,
    governanceComplianceReviewTypeValues,
    governanceComplianceRiskLevelValues,
} from "@/models/core/governance-compliance-review";

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

const governanceLeadershipIqacPlanBaseSchema = z.object({
    academicYearId: objectIdSchema,
    scopeType: z.enum(governanceLeadershipIqacPlanScopeValues).default("Department"),
    institutionId: optionalObjectIdSchema,
    departmentId: optionalObjectIdSchema,
    title: z.string().trim().min(3, "Plan title is required."),
    focusArea: z.enum(governanceLeadershipIqacFocusAreaValues).default("Integrated"),
    summary: z.string().trim().optional(),
    strategicPriorities: z.string().trim().optional(),
    targetMeetingCount: z.coerce.number().int().min(0).default(0),
    targetInitiativeCount: z.coerce.number().int().min(0).default(0),
    targetPolicyCount: z.coerce.number().int().min(0).default(0),
    targetComplianceReviewCount: z.coerce.number().int().min(0).default(0),
    ownerUserId: optionalObjectIdSchema,
    status: z.enum(governanceLeadershipIqacPlanStatusValues).default("Draft"),
});

function refinePlanScope(
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

export const governanceLeadershipIqacPlanSchema =
    governanceLeadershipIqacPlanBaseSchema.superRefine((value, ctx) => {
        refinePlanScope(value, ctx);
    });

export const governanceLeadershipIqacPlanUpdateSchema =
    governanceLeadershipIqacPlanBaseSchema.partial().superRefine((value, ctx) => {
        refinePlanScope(value, ctx);
    });

export const governanceLeadershipIqacAssignmentSchema = z.object({
    planId: objectIdSchema,
    assigneeUserId: objectIdSchema,
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().default(true),
});

export const governanceLeadershipIqacAssignmentUpdateSchema = z.object({
    assigneeUserId: objectIdSchema.optional(),
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().optional(),
});

export const governanceIqacMeetingDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    meetingType: z.enum(governanceIqacMeetingTypeValues).default("IQAC"),
    title: z.string().trim().min(2, "Meeting title is required."),
    meetingDate: optionalDateStringSchema,
    chairedBy: z.string().trim().optional(),
    attendeeCount: z.coerce.number().int().min(0).optional(),
    agendaSummary: z.string().trim().optional(),
    decisionSummary: z.string().trim().optional(),
    actionTakenSummary: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const governanceQualityInitiativeDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    initiativeType: z.enum(governanceQualityInitiativeTypeValues).default("AcademicAudit"),
    title: z.string().trim().min(2, "Initiative title is required."),
    startDate: optionalDateStringSchema,
    endDate: optionalDateStringSchema,
    status: z.enum(governanceQualityInitiativeStatusValues).default("Planned"),
    ownerName: z.string().trim().optional(),
    impactSummary: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const governancePolicyCircularDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    policyType: z.enum(governancePolicyCircularTypeValues).default("Policy"),
    title: z.string().trim().min(2, "Policy or circular title is required."),
    issueDate: optionalDateStringSchema,
    issuingAuthority: z.string().trim().optional(),
    applicabilityScope: z.string().trim().optional(),
    revisionStatus: z.enum(governancePolicyCircularRevisionStatusValues).default("New"),
    summary: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const governanceComplianceReviewDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    reviewType: z.enum(governanceComplianceReviewTypeValues).default("InternalQualityReview"),
    title: z.string().trim().min(2, "Compliance review title is required."),
    reviewDate: optionalDateStringSchema,
    status: z.enum(governanceComplianceReviewStatusValues).default("Scheduled"),
    riskLevel: z.enum(governanceComplianceRiskLevelValues).default("Moderate"),
    observationsSummary: z.string().trim().optional(),
    actionTakenSummary: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const governanceLeadershipIqacContributionDraftSchema = z.object({
    governanceStructureNarrative: z.string().trim().optional(),
    leadershipParticipationNarrative: z.string().trim().optional(),
    iqacFrameworkNarrative: z.string().trim().optional(),
    qualityInitiativesNarrative: z.string().trim().optional(),
    policyGovernanceNarrative: z.string().trim().optional(),
    complianceMonitoringNarrative: z.string().trim().optional(),
    stakeholderParticipationNarrative: z.string().trim().optional(),
    institutionalBestPracticesNarrative: z.string().trim().optional(),
    feedbackLoopNarrative: z.string().trim().optional(),
    actionPlan: z.string().trim().optional(),
    supportingLinks: z.array(z.string().trim().url("Invalid URL.")).default([]),
    documentIds: z.array(objectIdSchema).default([]),
    contributorRemarks: z.string().trim().optional(),
    iqacMeetings: z.array(governanceIqacMeetingDraftSchema).default([]),
    qualityInitiatives: z.array(governanceQualityInitiativeDraftSchema).default([]),
    policyCirculars: z.array(governancePolicyCircularDraftSchema).default([]),
    complianceReviews: z.array(governanceComplianceReviewDraftSchema).default([]),
});

export const governanceLeadershipIqacReviewSchema = z.object({
    remarks: z.string().trim().min(2, "Review remarks are required."),
    decision: z.enum(["Forward", "Recommend", "Approve", "Reject"]),
});

export type GovernanceLeadershipIqacPlanInput = z.output<
    typeof governanceLeadershipIqacPlanSchema
>;
export type GovernanceLeadershipIqacAssignmentInput = z.output<
    typeof governanceLeadershipIqacAssignmentSchema
>;
export type GovernanceLeadershipIqacContributionDraftInput = z.output<
    typeof governanceLeadershipIqacContributionDraftSchema
>;
export type GovernanceLeadershipIqacReviewInput = z.output<
    typeof governanceLeadershipIqacReviewSchema
>;

export { governanceLeadershipIqacWorkflowStatusValues };
