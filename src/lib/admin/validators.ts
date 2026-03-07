import { z } from "zod";

export const adminRoleOptions = [
    "Admin",
    "Faculty",
    "Student",
    "Director",
    "PRO",
    "NSS",
    "Sports",
    "Swayam",
    "Placement",
    "Alumni",
] as const;

export const masterDataSchema = z.object({
    category: z.string().trim().min(2, "Category is required."),
    label: z.string().trim().min(2, "Label is required."),
    code: z.string().trim().optional(),
    description: z.string().trim().optional(),
    parentCategory: z.string().trim().optional(),
    parentKey: z.string().trim().optional(),
    sortOrder: z.coerce.number().min(0).default(0),
    isActive: z.boolean().default(true),
    metadata: z
        .union([z.record(z.string(), z.unknown()), z.string().trim().length(0)])
        .optional(),
});

export const masterDataUpdateSchema = masterDataSchema.partial().extend({
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().min(0).optional(),
});

export const adminUserUpdateSchema = z.object({
    role: z.enum(adminRoleOptions).optional(),
    isActive: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
    collegeName: z.string().trim().optional(),
    schoolName: z.string().trim().optional(),
    department: z.string().trim().optional(),
});

export const systemUpdateSchema = z.object({
    type: z.enum(["News", "Notification", "VisitorCount", "DashboardStat"]),
    title: z.string().trim().min(2, "Title is required."),
    category: z.string().trim().optional(),
    targetRoles: z.array(z.string()).default([]),
    expiresAt: z.string().trim().optional(),
    isActive: z.boolean().default(true),
    content: z.string().trim().min(1, "Content is required."),
});

export const systemUpdatePatchSchema = systemUpdateSchema.partial();
