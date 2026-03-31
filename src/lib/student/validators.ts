import { z } from "zod";

const optionalString = (max: number, label: string) =>
    z.preprocess((value) => {
        if (typeof value !== "string") {
            return undefined;
        }

        const trimmed = value.trim();
        return trimmed.length ? trimmed : undefined;
    }, z.string().max(max, `${label} must be ${max} characters or fewer.`).optional());

const optionalDateString = z.preprocess((value) => {
    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Enter a valid date.",
}).optional());

export const studentProfileSchema = z.object({
    firstName: z.string().trim().min(1, "First name is required.").max(80, "First name is too long."),
    lastName: optionalString(80, "Last name"),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    dob: optionalDateString,
    mobile: optionalString(20, "Mobile number"),
    address: optionalString(500, "Address"),
});

export type StudentProfileValues = z.infer<typeof studentProfileSchema>;
