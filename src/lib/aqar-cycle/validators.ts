import { z } from "zod";

export const aqarCycleStatusSchema = z.enum([
    "Draft",
    "Department Review",
    "IQAC Review",
    "Finalized",
    "Submitted",
]);

export const aqarCycleCreateSchema = z
    .object({
        academicYearId: z.string().trim().optional(),
        academicYear: z.string().trim().min(4).optional(),
        reportingPeriod: z.object({
            fromDate: z.string().trim().min(4, "Reporting start date is required."),
            toDate: z.string().trim().min(4, "Reporting end date is required."),
        }),
    })
    .refine((value) => Boolean(value.academicYearId?.trim() || value.academicYear?.trim()), {
        message: "Academic year id or label is required.",
        path: ["academicYearId"],
    });

export const aqarCycleUpdateSchema = z.object({
    status: aqarCycleStatusSchema.optional(),
    criteriaSections: z
        .array(
            z.object({
                criterionCode: z.string().trim().min(1),
                narrative: z.string().trim().optional(),
                summary: z.string().trim().optional(),
                status: z.enum(["Pending", "Ready", "Reviewed"]).optional(),
            })
        )
        .optional(),
});
