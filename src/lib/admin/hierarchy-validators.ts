import { z } from "zod";

export const organizationTypes = [
    "University",
    "College",
    "Department",
    "Center",
    "Office",
] as const;

export const organizationSchema = z.object({
    name: z.string().trim().min(2, "Organization name is required."),
    type: z.enum(organizationTypes),
    code: z.string().trim().optional(),
    shortName: z.string().trim().optional(),
    description: z.string().trim().optional(),
    parentOrganizationId: z.string().trim().optional(),
    headUserId: z.string().trim().optional(),
    headTitle: z.string().trim().optional(),
    email: z.email("Enter a valid email address.").optional().or(z.literal("")),
    phone: z.string().trim().optional(),
    website: z.string().trim().optional(),
    isActive: z.boolean().default(true),
});

export const organizationUpdateSchema = organizationSchema.partial();
