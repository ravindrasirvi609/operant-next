import { z } from "zod";

const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/\d/, "Password must include a number.")
    .regex(/[^A-Za-z0-9]/, "Password must include a special character.");

const baseRegisterSchema = z.object({
    name: z.string().trim().min(3, "Name must be at least 3 characters."),
    email: z.email("Enter a valid email address."),
    password: passwordSchema,
    phone: z.string().trim().min(10, "Enter a valid phone number."),
    universityName: z.string().trim().min(2, "University is required."),
    department: z.string().trim().min(2, "Department is required."),
    collegeName: z.string().trim().min(2, "College name is required."),
});

const facultyRegisterSchema = baseRegisterSchema.extend({
    role: z.literal("Faculty"),
    designation: z.string().trim().min(2, "Designation is required."),
});

const studentRegisterSchema = baseRegisterSchema.extend({
    role: z.literal("Student"),
    rollNo: z.string().trim().min(2, "Roll number is required."),
    course: z.string().trim().min(2, "Course is required."),
    batch: z.string().trim().min(2, "Batch is required."),
    admissionYear: z
        .string()
        .trim()
        .regex(/^\d{4}$/, "Admission year must be a 4 digit year."),
});

export const registerSchema = z.discriminatedUnion("role", [
    facultyRegisterSchema,
    studentRegisterSchema,
]);

export const loginSchema = z.object({
    email: z.email("Enter a valid email address."),
    password: z.string().min(1, "Password is required."),
});

export const adminLoginSchema = loginSchema;

export const adminBootstrapSchema = z.object({
    name: z.string().trim().min(3, "Name must be at least 3 characters."),
    email: z.email("Enter a valid email address."),
    password: passwordSchema,
    universityName: z.string().trim().min(2, "University is required."),
    department: z.string().trim().min(2, "Department is required."),
    collegeName: z.string().trim().min(2, "College is required."),
});

export const forgotPasswordSchema = z.object({
    email: z.email("Enter a valid email address."),
});

export const resendVerificationSchema = forgotPasswordSchema;

export const resetPasswordSchema = z
    .object({
        token: z.string().min(1, "Reset token is required."),
        password: passwordSchema,
        confirmPassword: z.string().min(1, "Please confirm your password."),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
