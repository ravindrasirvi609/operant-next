import { describe, expect, it } from "vitest";

import { pbasApplicationSchema, pbasEntryModerationSchema } from "@/lib/pbas/validators";

describe("PBAS application schema", () => {
    it("accepts valid academic year and appraisal period", () => {
        const parsed = pbasApplicationSchema.safeParse({
            academicYear: "2025-2026",
            currentDesignation: "Assistant Professor (Stage 1)",
            appraisalPeriod: {
                fromDate: "2025-06-01",
                toDate: "2026-05-31",
            },
        });

        expect(parsed.success).toBe(true);
    });

    it("rejects reversed appraisal dates", () => {
        const parsed = pbasApplicationSchema.safeParse({
            academicYear: "2025-2026",
            currentDesignation: "Assistant Professor (Stage 1)",
            appraisalPeriod: {
                fromDate: "2026-05-31",
                toDate: "2025-06-01",
            },
        });

        expect(parsed.success).toBe(false);
    });

    it("rejects dates outside selected academic year", () => {
        const parsed = pbasApplicationSchema.safeParse({
            academicYear: "2025-2026",
            currentDesignation: "Assistant Professor (Stage 1)",
            appraisalPeriod: {
                fromDate: "2024-06-01",
                toDate: "2026-05-31",
            },
        });

        expect(parsed.success).toBe(false);
    });
});

describe("PBAS moderation schema", () => {
    it("accepts unique indicator updates", () => {
        const parsed = pbasEntryModerationSchema.safeParse({
            updates: [
                { indicatorId: "a", approvedScore: 1 },
                { indicatorId: "b", approvedScore: 2 },
            ],
        });

        expect(parsed.success).toBe(true);
    });

    it("rejects duplicate indicator updates", () => {
        const parsed = pbasEntryModerationSchema.safeParse({
            updates: [
                { indicatorId: "a", approvedScore: 1 },
                { indicatorId: "a", approvedScore: 2 },
            ],
        });

        expect(parsed.success).toBe(false);
    });
});
