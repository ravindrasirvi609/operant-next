import { Types } from "mongoose";

import { clearDatabase, setupTestDatabase, teardownTestDatabase } from "@/test/db";
import Student from "@/models/student/student";
import User from "@/models/core/user";
import { AuthError } from "@/lib/auth/errors";
import { promoteStudentToAlumni, resolveAlumniForUser } from "@/lib/alumni/service";
import { activateAlumniAccount } from "@/lib/auth/user";

// activateAlumniAccount issues a session cookie on success, which needs
// AUTH_SECRET and a request-scoped `next/headers` cookie jar — neither exists
// in a plain Vitest run, so both are stubbed for the success-path tests below.
vi.mock("next/headers", () => ({
    cookies: async () => ({
        set: () => {},
        get: () => undefined,
        delete: () => {},
    }),
}));

beforeAll(async () => {
    await setupTestDatabase();
    vi.stubEnv("AUTH_SECRET", "test-secret-key-for-alumni-activation-tests");
});

afterAll(async () => {
    await teardownTestDatabase();
    vi.unstubAllEnvs();
});

afterEach(async () => {
    await clearDatabase();
});

async function makePromotedAlumni(enrollmentNo: string) {
    const student = await Student.create({
        enrollmentNo,
        firstName: "Grad",
        email: `${enrollmentNo.toLowerCase()}@example.com`,
        mobile: "9876500000",
        departmentId: new Types.ObjectId(),
        programId: new Types.ObjectId(),
        admissionYear: 2019,
        status: "Graduated",
    });
    return promoteStudentToAlumni(
        { studentId: student._id.toString() },
        { actor: { id: new Types.ObjectId().toString(), name: "Admin", role: "Admin" } }
    );
}

describe("activateAlumniAccount (integration)", () => {
    it("activates a pre-provisioned alumni account by enrollment number and email", async () => {
        const { alumni } = await makePromotedAlumni("ACT-1");

        const result = await activateAlumniAccount({
            enrollmentNo: "ACT-1",
            verificationValue: "act-1@example.com",
            password: "Str0ng!Pass",
            confirmPassword: "Str0ng!Pass",
        });

        expect(result.user.role).toBe("Alumni");
        expect(result.user.accountStatus).toBe("Active");

        const persisted = await User.findById(alumni.userId).select("+password accountStatus");
        expect(persisted?.accountStatus).toBe("Active");
        expect(persisted?.password).toBeTruthy();
    });

    it("activates via registered mobile number as well", async () => {
        await makePromotedAlumni("ACT-2");

        const result = await activateAlumniAccount({
            enrollmentNo: "ACT-2",
            verificationValue: "9876500000",
            password: "Str0ng!Pass",
            confirmPassword: "Str0ng!Pass",
        });

        expect(result.user.accountStatus).toBe("Active");
    });

    it("rejects a mismatched contact detail", async () => {
        await makePromotedAlumni("ACT-3");

        await expect(
            activateAlumniAccount({
                enrollmentNo: "ACT-3",
                verificationValue: "someone-else@example.com",
                password: "Str0ng!Pass",
                confirmPassword: "Str0ng!Pass",
            })
        ).rejects.toThrow(AuthError);
    });

    it("rejects activating an already-active account", async () => {
        await makePromotedAlumni("ACT-4");
        await activateAlumniAccount({
            enrollmentNo: "ACT-4",
            verificationValue: "act-4@example.com",
            password: "Str0ng!Pass",
            confirmPassword: "Str0ng!Pass",
        });

        await expect(
            activateAlumniAccount({
                enrollmentNo: "ACT-4",
                verificationValue: "act-4@example.com",
                password: "Str0ng!Pass",
                confirmPassword: "Str0ng!Pass",
            })
        ).rejects.toThrow(AuthError);
    });

    it("rejects an unknown enrollment number", async () => {
        await expect(
            activateAlumniAccount({
                enrollmentNo: "NOT-REAL",
                verificationValue: "nope@example.com",
                password: "Str0ng!Pass",
                confirmPassword: "Str0ng!Pass",
            })
        ).rejects.toThrow(AuthError);
    });
});

describe("resolveAlumniForUser (integration)", () => {
    it("resolves the alumni's own record for a valid alumni user", async () => {
        const { user, alumni } = await makePromotedAlumni("API-1");

        const resolved = await resolveAlumniForUser(user._id.toString());

        expect(resolved.alumni._id.toString()).toBe(alumni._id.toString());
    });

    it("rejects a non-alumni user", async () => {
        const user = await User.create({ name: "S", email: "api-2@example.com", role: "Student" });

        await expect(resolveAlumniForUser(user._id.toString())).rejects.toThrow(AuthError);
    });
});
