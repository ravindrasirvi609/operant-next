import { describe, expect, it } from "vitest";

import { academicRecordEditRequestSchema } from "@/lib/student/record-validators";

describe("academicRecordEditRequestSchema", () => {
    it("accepts a request that changes one field and states a reason", () => {
        const parsed = academicRecordEditRequestSchema.safeParse({
            requestedChanges: { sgpa: 8.5 },
            reason: "SGPA was miscalculated for this semester.",
        });

        expect(parsed.success).toBe(true);
    });

    it("rejects a request with no changed fields", () => {
        const parsed = academicRecordEditRequestSchema.safeParse({
            requestedChanges: {},
            reason: "Please review my grades.",
        });

        expect(parsed.success).toBe(false);
    });

    it("rejects a request with a blank reason", () => {
        const parsed = academicRecordEditRequestSchema.safeParse({
            requestedChanges: { cgpa: 9 },
            reason: "   ",
        });

        expect(parsed.success).toBe(false);
    });
});
