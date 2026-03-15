import { z } from "zod";

export const academicYearSchema = z
    .object({
        yearStart: z.coerce.number().int().min(1900),
        yearEnd: z.coerce.number().int().min(1901),
        isActive: z.boolean().default(false),
    })
    .refine((value) => value.yearEnd > value.yearStart, {
        message: "Year end must be greater than year start.",
        path: ["yearEnd"],
    });

export const academicYearUpdateSchema = z.object({
    yearStart: z.coerce.number().int().min(1900).optional(),
    yearEnd: z.coerce.number().int().min(1901).optional(),
    isActive: z.boolean().optional(),
});

export const programSchema = z.object({
    name: z.string().trim().min(2, "Program name is required."),
    institutionId: z.string().trim().min(1, "Institution is required."),
    departmentId: z.string().trim().min(1, "Department is required."),
    startAcademicYearId: z.string().trim().min(1, "Start academic year is required."),
    degreeType: z.string().trim().min(2, "Degree type is required."),
    durationYears: z.coerce.number().int().min(1, "Duration must be at least 1 year."),
    isActive: z.boolean().default(true),
});

export const programUpdateSchema = programSchema.partial();

export const semesterSchema = z.object({
    programId: z.string().trim().min(1, "Program is required."),
    academicYearId: z.string().trim().min(1, "Academic year is required."),
    semesterNumber: z.coerce.number().int().min(1, "Semester number is required."),
});

export const semesterUpdateSchema = semesterSchema.partial();
