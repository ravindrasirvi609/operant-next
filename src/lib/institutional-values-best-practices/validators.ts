import { z } from "zod";

import {
    institutionalValuesBestPracticesPlanScopeValues,
    institutionalValuesBestPracticesPlanStatusValues,
    institutionalValuesBestPracticesThemeValues,
} from "@/models/quality/institutional-values-best-practices-plan";
import { institutionalValuesBestPracticesWorkflowStatusValues } from "@/models/quality/institutional-values-best-practices-assignment";
import {
    greenCampusInitiativeStatusValues,
    greenCampusInitiativeTypeValues,
} from "@/models/quality/green-campus-initiative";
import { energySourceValues } from "@/models/quality/energy-consumption-record";
import {
    environmentalResourceCategoryValues,
    environmentalResourceStatusValues,
} from "@/models/quality/environmental-resource-record";
import {
    waterManagementSystemStatusValues,
    waterManagementSystemTypeValues,
} from "@/models/quality/water-management-system";
import { wasteManagementPracticeTypeValues } from "@/models/quality/waste-management-practice";
import { genderEquityProgramTypeValues } from "@/models/quality/gender-equity-program";
import {
    codeOfConductStakeholderTypeValues,
    codeOfConductStatusValues,
} from "@/models/quality/code-of-conduct-record";
import {
    inclusivenessFacilityStatusValues,
    inclusivenessFacilityTypeValues,
} from "@/models/quality/inclusiveness-facility";
import {
    ethicsProgramCategoryValues,
    ethicsRecordStatusValues,
    ethicsStakeholderTypeValues,
} from "@/models/quality/ethics-program";
import { communityOutreachActivityTypeValues } from "@/models/quality/community-outreach-program";
import { outreachParticipantTypeValues } from "@/models/quality/outreach-participant";
import { sustainabilityAuditTypeValues } from "@/models/quality/sustainability-audit";

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

const institutionalValuesBestPracticesPlanBaseSchema = z.object({
    academicYearId: objectIdSchema,
    scopeType: z.enum(institutionalValuesBestPracticesPlanScopeValues).default("Department"),
    institutionId: optionalObjectIdSchema,
    departmentId: optionalObjectIdSchema,
    title: z.string().trim().min(3, "Plan title is required."),
    theme: z.enum(institutionalValuesBestPracticesThemeValues).default("Integrated"),
    overview: z.string().trim().optional(),
    strategicPriorities: z.string().trim().optional(),
    targetEnvironmentalRecords: z.coerce.number().int().min(0).default(0),
    targetInclusionRecords: z.coerce.number().int().min(0).default(0),
    targetEthicsRecords: z.coerce.number().int().min(0).default(0),
    targetOutreachPrograms: z.coerce.number().int().min(0).default(0),
    targetBestPractices: z.coerce.number().int().min(0).default(0),
    targetDistinctivenessNarratives: z.coerce.number().int().min(0).default(0),
    targetAuditCount: z.coerce.number().int().min(0).default(0),
    ownerUserId: optionalObjectIdSchema,
    status: z.enum(institutionalValuesBestPracticesPlanStatusValues).default("Draft"),
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

export const institutionalValuesBestPracticesPlanSchema =
    institutionalValuesBestPracticesPlanBaseSchema.superRefine((value, ctx) => {
        refinePlanScope(value, ctx);
    });

export const institutionalValuesBestPracticesPlanUpdateSchema =
    institutionalValuesBestPracticesPlanBaseSchema.partial().superRefine((value, ctx) => {
        refinePlanScope(value, ctx);
    });

export const institutionalValuesBestPracticesAssignmentSchema = z.object({
    planId: objectIdSchema,
    assigneeUserId: objectIdSchema,
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().default(true),
});

export const institutionalValuesBestPracticesAssignmentUpdateSchema = z.object({
    assigneeUserId: objectIdSchema.optional(),
    dueDate: optionalDateStringSchema,
    notes: z.string().trim().optional(),
    isActive: z.boolean().optional(),
});

export const greenCampusInitiativeDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    initiativeType: z.enum(greenCampusInitiativeTypeValues).default("TreePlantation"),
    title: z.string().trim().min(2, "Initiative title is required."),
    startDate: optionalDateStringSchema,
    endDate: optionalDateStringSchema,
    status: z.enum(greenCampusInitiativeStatusValues).default("Planned"),
    impactDescription: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const environmentalResourceRecordDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    resourceCategory: z.enum(environmentalResourceCategoryValues).default("EnergyConsumption"),
    resourceType: z.string().trim().optional(),
    recordedMonth: z.string().trim().optional(),
    unitsConsumed: z.coerce.number().min(0).optional(),
    costIncurred: z.coerce.number().min(0).optional(),
    installationYear: z.coerce.number().int().min(1900).max(3000).optional(),
    capacityLiters: z.coerce.number().min(0).optional(),
    methodology: z.string().trim().optional(),
    status: z.enum(environmentalResourceStatusValues).default("Active"),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const energyConsumptionRecordDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    energySource: z.enum(energySourceValues).default("Electricity"),
    academicYearId: optionalObjectIdSchema,
    unitsConsumed: z.coerce.number().min(0).optional(),
    costIncurred: z.coerce.number().min(0).optional(),
    recordedMonth: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const waterManagementSystemDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    systemType: z.enum(waterManagementSystemTypeValues).default("RainwaterHarvesting"),
    installationYear: z.coerce.number().int().min(1900).max(3000).optional(),
    capacityLiters: z.coerce.number().min(0).optional(),
    status: z.enum(waterManagementSystemStatusValues).default("Active"),
    methodology: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const wasteManagementPracticeDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    practiceType: z.enum(wasteManagementPracticeTypeValues).default("Solid"),
    methodology: z.string().trim().optional(),
    implementedDate: optionalDateStringSchema,
    impactSummary: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const genderEquityProgramDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    programType: z.enum(genderEquityProgramTypeValues).default("Awareness"),
    title: z.string().trim().min(2, "Program title is required."),
    conductedDate: optionalDateStringSchema,
    participantsCount: z.coerce.number().int().min(0).optional(),
    impactNotes: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const inclusivenessFacilityDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    facilityType: z.enum(inclusivenessFacilityTypeValues).default("Ramp"),
    locationDescription: z.string().trim().optional(),
    establishedYear: z.coerce.number().int().min(1900).max(3000).optional(),
    status: z.enum(inclusivenessFacilityStatusValues).default("Active"),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const ethicsProgramDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    title: z.string().trim().min(2, "Ethics title is required."),
    programCategory: z.enum(ethicsProgramCategoryValues).default("ProfessionalEthics"),
    programDate: optionalDateStringSchema,
    targetAudience: z.string().trim().optional(),
    stakeholderType: z.enum(ethicsStakeholderTypeValues).default("All"),
    status: z.enum(ethicsRecordStatusValues).default("Active"),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const codeOfConductRecordDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    title: z.string().trim().min(2, "Code of conduct title is required."),
    stakeholderType: z.enum(codeOfConductStakeholderTypeValues).default("All"),
    effectiveDate: optionalDateStringSchema,
    reviewCycleYears: z.coerce.number().int().min(0).max(20).optional(),
    status: z.enum(codeOfConductStatusValues).default("Active"),
    policyDocumentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const communityOutreachProgramDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    activityType: z.enum(communityOutreachActivityTypeValues).default("VillageAdoption"),
    title: z.string().trim().min(2, "Outreach program title is required."),
    location: z.string().trim().optional(),
    startDate: optionalDateStringSchema,
    endDate: optionalDateStringSchema,
    beneficiariesCount: z.coerce.number().int().min(0).optional(),
    impactSummary: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const outreachParticipantDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    programId: optionalObjectIdSchema,
    programDisplayOrder: z.coerce.number().int().min(1).optional(),
    participantType: z.enum(outreachParticipantTypeValues).default("Student"),
    participantId: z.string().trim().optional(),
    participantName: z.string().trim().optional(),
    hoursContributed: z.coerce.number().min(0).optional(),
    certificateDocumentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const institutionalBestPracticeDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    practiceTitle: z.string().trim().min(2, "Practice title is required."),
    objectives: z.string().trim().optional(),
    context: z.string().trim().optional(),
    implementationDetails: z.string().trim().optional(),
    evidenceOfSuccess: z.string().trim().optional(),
    problemsEncountered: z.string().trim().optional(),
    resourcesRequired: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const institutionalDistinctivenessDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    distinctFeatureTitle: z.string().trim().min(2, "Distinct feature title is required."),
    description: z.string().trim().optional(),
    impactOnStudents: z.string().trim().optional(),
    societalImpact: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const sustainabilityAuditDraftSchema = z.object({
    _id: optionalObjectIdSchema,
    auditType: z.enum(sustainabilityAuditTypeValues).default("GreenAudit"),
    auditAgency: z.string().trim().optional(),
    auditYear: z.coerce.number().int().min(1900).max(3000).optional(),
    auditScore: z.coerce.number().optional(),
    recommendations: z.string().trim().optional(),
    documentId: optionalObjectIdSchema,
    displayOrder: z.coerce.number().int().min(1).default(1),
});

export const institutionalValuesBestPracticesContributionDraftSchema = z.object({
    environmentalSustainabilityNarrative: z.string().trim().optional(),
    inclusivenessNarrative: z.string().trim().optional(),
    humanValuesNarrative: z.string().trim().optional(),
    communityOutreachNarrative: z.string().trim().optional(),
    bestPracticesNarrative: z.string().trim().optional(),
    institutionalDistinctivenessNarrative: z.string().trim().optional(),
    sustainabilityAuditNarrative: z.string().trim().optional(),
    actionPlan: z.string().trim().optional(),
    supportingLinks: z.array(z.string().trim().url("Invalid URL.")).default([]),
    documentIds: z.array(objectIdSchema).default([]),
    contributorRemarks: z.string().trim().optional(),
    greenCampusInitiatives: z.array(greenCampusInitiativeDraftSchema).default([]),
    environmentalResourceRecords: z.array(environmentalResourceRecordDraftSchema).default([]),
    energyConsumptionRecords: z.array(energyConsumptionRecordDraftSchema).default([]),
    waterManagementSystems: z.array(waterManagementSystemDraftSchema).default([]),
    wasteManagementPractices: z.array(wasteManagementPracticeDraftSchema).default([]),
    genderEquityPrograms: z.array(genderEquityProgramDraftSchema).default([]),
    inclusivenessFacilities: z.array(inclusivenessFacilityDraftSchema).default([]),
    ethicsPrograms: z.array(ethicsProgramDraftSchema).default([]),
    codeOfConductRecords: z.array(codeOfConductRecordDraftSchema).default([]),
    communityOutreachPrograms: z.array(communityOutreachProgramDraftSchema).default([]),
    outreachParticipants: z.array(outreachParticipantDraftSchema).default([]),
    institutionalBestPractices: z.array(institutionalBestPracticeDraftSchema).default([]),
    institutionalDistinctivenessEntries: z.array(institutionalDistinctivenessDraftSchema).default([]),
    sustainabilityAudits: z.array(sustainabilityAuditDraftSchema).default([]),
});

export const institutionalValuesBestPracticesReviewSchema = z.object({
    remarks: z.string().trim().min(2, "Review remarks are required."),
    decision: z.enum(["Forward", "Recommend", "Approve", "Reject"]),
});

export type InstitutionalValuesBestPracticesPlanInput = z.output<
    typeof institutionalValuesBestPracticesPlanSchema
>;
export type InstitutionalValuesBestPracticesAssignmentInput = z.output<
    typeof institutionalValuesBestPracticesAssignmentSchema
>;
export type InstitutionalValuesBestPracticesContributionDraftInput = z.output<
    typeof institutionalValuesBestPracticesContributionDraftSchema
>;
export type InstitutionalValuesBestPracticesReviewInput = z.output<
    typeof institutionalValuesBestPracticesReviewSchema
>;

export { institutionalValuesBestPracticesWorkflowStatusValues };
