import { z } from "zod";

import {
    infrastructureLibraryPlanScopeValues,
    infrastructureLibraryPlanStatusValues,
    infrastructureLibraryFocusAreaValues,
} from "@/models/operations/infrastructure-library-plan";
import { infrastructureLibraryWorkflowStatusValues } from "@/models/operations/infrastructure-library-assignment";
import {
    infrastructureFacilityStatusValues,
    infrastructureFacilityTypeValues,
} from "@/models/operations/infrastructure-library-facility";
import {
    infrastructureLibraryMaintenanceAssetCategoryValues,
    infrastructureLibraryMaintenanceStatusValues,
    infrastructureLibraryMaintenanceTypeValues,
} from "@/models/operations/infrastructure-library-maintenance";
import {
    infrastructureLibraryResourceAccessModeValues,
    infrastructureLibraryResourceStatusValues,
    infrastructureLibraryResourceTypeValues,
} from "@/models/operations/infrastructure-library-resource";
import { infrastructureLibraryUsageTypeValues } from "@/models/operations/infrastructure-library-usage";

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

const infrastructureLibraryPlanBaseSchema = z.object({
    academicYearId: objectIdSchema,
    scopeType: z.enum(infrastructureLibraryPlanScopeValues).default("Department"),
    institutionId: optionalObjectIdSchema,
    departmentId: optionalObjectIdSchema,
    title: z.string().trim().min(3, "Plan title is required."),
    focusArea: z.enum(infrastructureLibraryFocusAreaValues).default("Integrated"),
    summary: z.string().trim().optional(),
    strategyGoals: z.string().trim().optional(),
    targetClassroomCount: z.coerce.number().int().min(0).default(0),
    targetLaboratoryCount: z.coerce.number().int().min(0).default(0),
    targetBookCount: z.coerce.number().int().min(0).default(0),
    targetJournalCount: z.coerce.number().int().min(0).default(0),
    targetEresourceCount: z.coerce.number().int().min(0).default(0),
    targetBandwidthMbps: z.coerce.number().min(0).default(0),
    facultyOwnerUserId: optionalObjectIdSchema,
    status: z.enum(infrastructureLibraryPlanStatusValues).default("Draft"),
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

export const infrastructureLibraryPlanSchema =
    infrastructureLibraryPlanBaseSchema.superRefine((value, ctx) => {
        refinePlanScope(value, ctx);
    });

export const infrastructureLibraryPlanUpdateSchema =
    infrastructureLibraryPlanBaseSchema.partial().superRefine((value, ctx) => {
        refinePlanScope(value, ctx);
    });

export const infrastructureLibraryAssignmentSchema = z.object({
    planId: objectIdSchema,
    assigneeUserId: objectIdSchema,
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().default(true),
});

export const infrastructureLibraryAssignmentUpdateSchema = z.object({
    assigneeUserId: objectIdSchema.optional(),
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().optional(),
});

export const infrastructureLibraryFacilityDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    facilityType: z.enum(infrastructureFacilityTypeValues).default("Classroom"),
    name: z.string().trim().min(2, "Facility name is required."),
    identifier: z.string().trim().optional(),
    buildingName: z.string().trim().optional(),
    quantity: z.coerce.number().int().min(0).optional(),
    capacity: z.coerce.number().int().min(0).optional(),
    areaSqFt: z.coerce.number().min(0).optional(),
    ictEnabled: z.boolean().default(false),
    status: z.enum(infrastructureFacilityStatusValues).default("Available"),
    utilizationPercent: z.coerce.number().min(0).max(100).optional(),
    remarks: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const infrastructureLibraryResourceDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    resourceType: z.enum(infrastructureLibraryResourceTypeValues).default("Book"),
    title: z.string().trim().min(2, "Resource title is required."),
    category: z.string().trim().optional(),
    vendorPublisher: z.string().trim().optional(),
    accessionNumber: z.string().trim().optional(),
    isbnIssn: z.string().trim().optional(),
    copiesCount: z.coerce.number().int().min(0).optional(),
    subscriptionStartDate: optionalDateStringSchema,
    subscriptionEndDate: optionalDateStringSchema,
    accessMode: z.enum(infrastructureLibraryResourceAccessModeValues).default("Print"),
    availabilityStatus: z.enum(infrastructureLibraryResourceStatusValues).default("Active"),
    usageCount: z.coerce.number().int().min(0).optional(),
    remarks: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const infrastructureLibraryUsageDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    usageType: z.enum(infrastructureLibraryUsageTypeValues).default("LibraryFootfall"),
    title: z.string().trim().min(2, "Usage title is required."),
    periodLabel: z.string().trim().optional(),
    usageCount: z.coerce.number().int().min(0).optional(),
    satisfactionScore: z.coerce.number().min(0).max(5).optional(),
    targetGroup: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const infrastructureLibraryMaintenanceDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    assetCategory: z.enum(infrastructureLibraryMaintenanceAssetCategoryValues).default("Facility"),
    assetName: z.string().trim().min(2, "Asset name is required."),
    maintenanceType: z.enum(infrastructureLibraryMaintenanceTypeValues).default("Preventive"),
    vendorName: z.string().trim().optional(),
    serviceDate: optionalDateStringSchema,
    nextDueDate: optionalDateStringSchema,
    status: z.enum(infrastructureLibraryMaintenanceStatusValues).default("Scheduled"),
    costAmount: z.coerce.number().min(0).optional(),
    remarks: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const infrastructureLibraryContributionDraftSchema = z.object({
    infrastructureOverview: z.string().trim().optional(),
    libraryOverview: z.string().trim().optional(),
    digitalAccessStrategy: z.string().trim().optional(),
    maintenanceProtocol: z.string().trim().optional(),
    utilizationInsights: z.string().trim().optional(),
    accessibilitySupport: z.string().trim().optional(),
    greenPractices: z.string().trim().optional(),
    safetyCompliance: z.string().trim().optional(),
    studentSupportServices: z.string().trim().optional(),
    resourceGapActionPlan: z.string().trim().optional(),
    supportingLinks: z.array(z.string().trim().url("Invalid URL.")).default([]),
    documentIds: z.array(objectIdSchema).default([]),
    contributorRemarks: z.string().trim().optional(),
    facilities: z.array(infrastructureLibraryFacilityDraftSchema).default([]),
    libraryResources: z.array(infrastructureLibraryResourceDraftSchema).default([]),
    usageRows: z.array(infrastructureLibraryUsageDraftSchema).default([]),
    maintenanceRows: z.array(infrastructureLibraryMaintenanceDraftSchema).default([]),
});

export const infrastructureLibraryReviewSchema = z.object({
    remarks: z.string().trim().min(2, "Review remarks are required."),
    decision: z.enum(["Forward", "Recommend", "Approve", "Reject"]),
});

export type InfrastructureLibraryPlanInput = z.output<
    typeof infrastructureLibraryPlanSchema
>;
export type InfrastructureLibraryAssignmentInput = z.output<
    typeof infrastructureLibraryAssignmentSchema
>;
export type InfrastructureLibraryContributionDraftInput = z.output<
    typeof infrastructureLibraryContributionDraftSchema
>;
export type InfrastructureLibraryReviewInput = z.output<
    typeof infrastructureLibraryReviewSchema
>;

export { infrastructureLibraryWorkflowStatusValues };
