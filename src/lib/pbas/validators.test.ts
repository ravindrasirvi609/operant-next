import { describe, expect, it } from "vitest";

import { pbasApplicationSchema, pbasEntryModerationSchema } from "@/lib/pbas/validators";

const baseYear = new Date().getFullYear();
const testAcademicYear = `${baseYear}-${baseYear + 1}`;

describe("PBAS application schema", () => {
    it("accepts valid academic year and appraisal period", () => {
        const parsed = pbasApplicationSchema.safeParse({
            academicYear: testAcademicYear,
            currentDesignation: "Assistant Professor (Stage 1)",
            appraisalPeriod: {
                fromDate: `${baseYear}-06-01`,
                toDate: `${baseYear + 1}-05-31`,
            },
        });

        expect(parsed.success).toBe(true);
    });

    it("rejects reversed appraisal dates", () => {
        const parsed = pbasApplicationSchema.safeParse({
            academicYear: testAcademicYear,
            currentDesignation: "Assistant Professor (Stage 1)",
            appraisalPeriod: {
                fromDate: `${baseYear + 1}-05-31`,
                toDate: `${baseYear}-06-01`,
            },
        });

        expect(parsed.success).toBe(false);
    });

    it("rejects dates outside selected academic year", () => {
        const parsed = pbasApplicationSchema.safeParse({
            academicYear: testAcademicYear,
            currentDesignation: "Assistant Professor (Stage 1)",
            appraisalPeriod: {
                fromDate: `${baseYear - 1}-06-01`,
                toDate: `${baseYear + 1}-05-31`,
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
