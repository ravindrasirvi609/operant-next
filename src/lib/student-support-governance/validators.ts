import { z } from "zod";

import {
    studentSupportGovernancePlanScopeValues,
    studentSupportGovernancePlanStatusValues,
    studentSupportGovernanceFocusAreaValues,
} from "@/models/student/student-support-governance-plan";
import { studentSupportGovernanceWorkflowStatusValues } from "@/models/student/student-support-governance-assignment";
import { studentSupportGrievanceCategoryValues, studentSupportGrievanceLodgedByValues, studentSupportGrievanceStatusValues } from "@/models/student/student-support-grievance";
import { studentSupportProgressionStatusValues, studentSupportProgressionTypeValues } from "@/models/student/student-support-progression";
import { studentSupportRepresentationTypeValues } from "@/models/student/student-support-representation";

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

const studentSupportGovernancePlanBaseSchema = z.object({
    academicYearId: objectIdSchema,
    scopeType: z.enum(studentSupportGovernancePlanScopeValues).default("Department"),
    institutionId: optionalObjectIdSchema,
    departmentId: optionalObjectIdSchema,
    title: z.string().trim().min(3, "Plan title is required."),
    focusArea: z.enum(studentSupportGovernanceFocusAreaValues).default("Integrated"),
    summary: z.string().trim().optional(),
    strategyGoals: z.string().trim().optional(),
    targetMentorGroupCount: z.coerce.number().int().min(0).default(0),
    targetGrievanceClosureCount: z.coerce.number().int().min(0).default(0),
    targetScholarshipBeneficiaryCount: z.coerce.number().int().min(0).default(0),
    targetPlacementCount: z.coerce.number().int().min(0).default(0),
    targetHigherStudiesCount: z.coerce.number().int().min(0).default(0),
    targetRepresentationCount: z.coerce.number().int().min(0).default(0),
    facultyOwnerUserId: optionalObjectIdSchema,
    status: z.enum(studentSupportGovernancePlanStatusValues).default("Draft"),
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

export const studentSupportGovernancePlanSchema =
    studentSupportGovernancePlanBaseSchema.superRefine((value, ctx) => {
        refinePlanScope(value, ctx);
    });

export const studentSupportGovernancePlanUpdateSchema =
    studentSupportGovernancePlanBaseSchema.partial().superRefine((value, ctx) => {
        refinePlanScope(value, ctx);
    });

export const studentSupportGovernanceAssignmentSchema = z.object({
    planId: objectIdSchema,
    assigneeUserId: objectIdSchema,
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().default(true),
});

export const studentSupportGovernanceAssignmentUpdateSchema = z.object({
    assigneeUserId: objectIdSchema.optional(),
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().optional(),
});

export const studentSupportMentorGroupDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    groupName: z.string().trim().min(2, "Group name is required."),
    programName: z.string().trim().optional(),
    batchLabel: z.string().trim().optional(),
    mentorName: z.string().trim().optional(),
    menteeCount: z.coerce.number().int().min(0).optional(),
    meetingCount: z.coerce.number().int().min(0).optional(),
    supportThemes: z.string().trim().optional(),
    escalatedCount: z.coerce.number().int().min(0).optional(),
    actionTaken: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const studentSupportGrievanceDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    category: z.enum(studentSupportGrievanceCategoryValues).default("Academic"),
    referenceNumber: z.string().trim().optional(),
    lodgedByType: z.enum(studentSupportGrievanceLodgedByValues).default("Student"),
    receivedDate: optionalDateStringSchema,
    resolvedDate: optionalDateStringSchema,
    status: z.enum(studentSupportGrievanceStatusValues).default("Open"),
    resolutionDays: z.coerce.number().int().min(0).optional(),
    committeeName: z.string().trim().optional(),
    resolutionSummary: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const studentSupportProgressionDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    progressionType: z.enum(studentSupportProgressionTypeValues).default("Placement"),
    title: z.string().trim().min(2, "Progression title is required."),
    batchLabel: z.string().trim().optional(),
    programName: z.string().trim().optional(),
    destinationName: z.string().trim().optional(),
    studentCount: z.coerce.number().int().min(0).optional(),
    medianPackageLpa: z.coerce.number().min(0).optional(),
    status: z.enum(studentSupportProgressionStatusValues).default("Placed"),
    remarks: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const studentSupportRepresentationDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    representationType: z.enum(studentSupportRepresentationTypeValues).default("StudentCouncil"),
    bodyName: z.string().trim().min(2, "Body name is required."),
    roleTitle: z.string().trim().optional(),
    studentCount: z.coerce.number().int().min(0).optional(),
    meetingCount: z.coerce.number().int().min(0).optional(),
    outcomeSummary: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const studentSupportGovernanceContributionDraftSchema = z.object({
    mentoringFramework: z.string().trim().optional(),
    grievanceRedressalSystem: z.string().trim().optional(),
    scholarshipSupport: z.string().trim().optional(),
    progressionTracking: z.string().trim().optional(),
    placementReadiness: z.string().trim().optional(),
    studentRepresentation: z.string().trim().optional(),
    wellbeingSupport: z.string().trim().optional(),
    inclusionSupport: z.string().trim().optional(),
    feedbackMechanism: z.string().trim().optional(),
    actionPlan: z.string().trim().optional(),
    supportingLinks: z.array(z.string().trim().url("Invalid URL.")).default([]),
    documentIds: z.array(objectIdSchema).default([]),
    contributorRemarks: z.string().trim().optional(),
    mentorGroups: z.array(studentSupportMentorGroupDraftSchema).default([]),
    grievances: z.array(studentSupportGrievanceDraftSchema).default([]),
    progressionRows: z.array(studentSupportProgressionDraftSchema).default([]),
    representationRows: z.array(studentSupportRepresentationDraftSchema).default([]),
});

export const studentSupportGovernanceReviewSchema = z.object({
    remarks: z.string().trim().min(2, "Review remarks are required."),
    decision: z.enum(["Forward", "Recommend", "Approve", "Reject"]),
});

export type StudentSupportGovernancePlanInput = z.output<
    typeof studentSupportGovernancePlanSchema
>;
export type StudentSupportGovernanceAssignmentInput = z.output<
    typeof studentSupportGovernanceAssignmentSchema
>;
export type StudentSupportGovernanceContributionDraftInput = z.output<
    typeof studentSupportGovernanceContributionDraftSchema
>;
export type StudentSupportGovernanceReviewInput = z.output<
    typeof studentSupportGovernanceReviewSchema
>;

export { studentSupportGovernanceWorkflowStatusValues };
