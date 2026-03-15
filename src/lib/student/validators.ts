import { z } from "zod";

export const studentProjectSchema = z.object({
    title: z.string().trim().min(2, "Project title is required."),
    description: z.string().trim().optional(),
    techStack: z.array(z.string().trim()).default([]),
    link: z.string().trim().optional(),
});

export const studentInternshipSchema = z.object({
    organization: z.string().trim().min(2, "Organization is required."),
    role: z.string().trim().optional(),
    duration: z.string().trim().optional(),
    description: z.string().trim().optional(),
});

export const studentProfileSchema = z.object({
    dateOfBirth: z.string().trim().min(4, "Date of birth is required."),
    gender: z.string().trim().min(1, "Gender is required."),
    bloodGroup: z.string().trim().optional(),
    address: z.string().trim().min(5, "Address is required."),
    city: z.string().trim().min(2, "City is required."),
    state: z.string().trim().min(2, "State is required."),
    postalCode: z.string().trim().min(4, "Postal code is required."),
    emergencyContactName: z.string().trim().min(2, "Emergency contact name is required."),
    emergencyContactPhone: z.string().trim().min(10, "Emergency contact phone is required."),
    parentName: z.string().trim().min(2, "Parent name is required."),
    parentPhone: z.string().trim().min(10, "Parent phone is required."),
});

export const studentApprovalDecisionSchema = z.object({
    decision: z.enum(["approve", "reject"]),
    notes: z.string().trim().optional(),
});
