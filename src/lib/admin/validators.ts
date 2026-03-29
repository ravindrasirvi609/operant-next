import { z } from "zod";

export const adminRoleOptions = [
    "Admin",
    "Faculty",
    "Student",
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
    universityName: z.string().trim().optional(),
    collegeName: z.string().trim().optional(),
    department: z.string().trim().optional(),
});

export const adminStudentProvisionSchema = z.object({
    firstName: z.string().trim().min(2, "First name is required."),
    lastName: z.string().trim().optional(),
    enrollmentNo: z.string().trim().min(2, "Enrollment number is required."),
    email: z.email("Institutional email is required."),
    mobile: z.string().trim().min(10, "Mobile number is required."),
    universityName: z.string().trim().min(2, "University is required."),
    collegeName: z.string().trim().min(2, "College is required."),
    department: z.string().trim().min(2, "Department is required."),
    programId: z.string().trim().optional(),
    courseId: z.string().trim().optional(),
    course: z.string().trim().min(2, "Program / course is required."),
    durationYears: z.coerce.number().int().min(1).max(10),
    admissionYear: z.coerce.number().int().min(1900).max(9999),
});

export const adminFacultyProvisionSchema = z.object({
    firstName: z.string().trim().min(2, "First name is required."),
    lastName: z.string().trim().optional(),
    employeeCode: z.string().trim().min(2, "Employee code is required."),
    email: z.email("Institutional email is required."),
    mobile: z.string().trim().min(10, "Mobile number is required."),
    universityName: z.string().trim().min(2, "University is required."),
    collegeName: z.string().trim().min(2, "College is required."),
    department: z.string().trim().min(2, "Department is required."),
    designation: z.string().trim().min(2, "Designation is required."),
    employmentType: z.enum(["Permanent", "AdHoc", "Guest"]).default("Permanent"),
    joiningDate: z.string().trim().optional(),
    highestQualification: z.string().trim().optional(),
    specialization: z.string().trim().optional(),
    experienceYears: z.coerce.number().min(0).default(0),
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
