import { z } from "zod";

export const naacMetricCycleCreateSchema = z.object({
    academicYearId: z.string().trim().optional(),
    academicYear: z.string().trim().optional(),
    title: z.string().trim().min(3, "Cycle title must be at least 3 characters.").max(160),
});

export const naacMetricValueReviewSchema = z
    .object({
        status: z.enum(["Reviewed", "Overridden"]),
        reviewRemarks: z.string().trim().max(2000).optional(),
        overrideNumericValue: z.coerce.number().optional(),
        overrideTextValue: z.string().trim().max(2000).optional(),
        overrideReason: z.string().trim().max(2000).optional(),
    })
    .superRefine((value, ctx) => {
        if (value.status !== "Overridden") {
            return;
        }

        const hasNumeric = typeof value.overrideNumericValue === "number" && Number.isFinite(value.overrideNumericValue);
        const hasText = Boolean(value.overrideTextValue?.trim());

        if (!hasNumeric && !hasText) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["overrideNumericValue"],
                message: "Provide an override value before saving an override.",
            });
        }

        if (!value.overrideReason?.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["overrideReason"],
                message: "Override reason is required.",
            });
        }
    });

export const naacMetricValueManualUpdateSchema = z
    .object({
        numericValue: z.coerce.number().optional(),
        textValue: z.string().trim().max(2000).optional(),
        remarks: z.string().trim().max(2000).optional(),
    })
    .superRefine((value, ctx) => {
        const hasNumeric = typeof value.numericValue === "number" && Number.isFinite(value.numericValue);
        const hasText = Boolean(value.textValue?.trim());

        if (!hasNumeric && !hasText) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["numericValue"],
                message: "Provide a manual value before saving.",
            });
        }
    });
