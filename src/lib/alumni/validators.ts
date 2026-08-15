import { z } from "zod";

import { alumniContributionBandValues, alumniContributionTypeValues } from "@/models/alumni/alumni-contribution";

const objectIdSchema = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, "Invalid identifier.");
const optionalObjectIdSchema = z.string().trim().optional().refine(
    (value) => !value || /^[a-fA-F0-9]{24}$/.test(value),
    "Invalid identifier."
);

export const alumniPromotionSchema = z.object({
    studentId: objectIdSchema,
    graduationYear: z.coerce.number().int().min(1900).optional(),
});

export const alumniAssociationSchema = z.object({
    institutionId: objectIdSchema,
    name: z.string().trim().min(2, "Association name is required."),
    isRegistered: z.boolean().default(false),
    registrationDate: z.string().trim().optional(),
    isFunctional: z.boolean().default(false),
    description: z.string().trim().optional(),
    contactPersonName: z.string().trim().optional(),
    contactEmail: z.string().trim().email("Invalid email.").optional().or(z.literal("")),
    website: z.string().trim().optional(),
});

export const alumniAssociationUpdateSchema = alumniAssociationSchema.partial();

export const alumniProfileUpdateSchema = z.object({
    mobile: z.string().trim().min(6, "Enter a valid mobile number.").optional(),
    currentEmployer: z.string().trim().optional(),
    currentDesignation: z.string().trim().optional(),
});

export const alumniContributionSchema = z.object({
    associationId: objectIdSchema,
    alumniId: optionalObjectIdSchema,
    alumniName: z.string().trim().min(2, "Alumni name is required."),
    contributionType: z.enum(alumniContributionTypeValues).default("Financial"),
    contributionBand: z.enum(alumniContributionBandValues),
    amount: z.coerce.number().min(0).optional(),
    purposeDescription: z.string().trim().optional(),
    contributionYear: z.coerce.number().int().min(1900),
    documentId: optionalObjectIdSchema,
});
