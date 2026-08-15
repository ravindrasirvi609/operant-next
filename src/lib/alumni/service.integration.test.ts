import { Types } from "mongoose";

import { clearDatabase, setupTestDatabase, teardownTestDatabase } from "@/test/db";
import Student from "@/models/student/student";
import User from "@/models/core/user";
import Alumni from "@/models/alumni/alumni";
import AlumniAssociation from "@/models/alumni/alumni-association";
import { AuthError } from "@/lib/auth/errors";
import {
    createAlumniContribution,
    listAlumniContributions,
    promoteGraduatedStudentsBulk,
    promoteStudentToAlumni,
    upsertAlumniAssociation,
} from "@/lib/alumni/service";

beforeAll(async () => {
    await setupTestDatabase();
});

afterAll(async () => {
    await teardownTestDatabase();
});

afterEach(async () => {
    await clearDatabase();
});

const admin = { id: new Types.ObjectId().toString(), name: "Admin", role: "Admin" };

async function makeGraduatedStudent(enrollmentNo: string, overrides: Record<string, unknown> = {}) {
    return Student.create({
        enrollmentNo,
        firstName: "Grad",
        lastName: enrollmentNo,
        email: `${enrollmentNo.toLowerCase()}@example.com`,
        departmentId: new Types.ObjectId(),
        programId: new Types.ObjectId(),
        admissionYear: 2019,
        status: "Graduated",
        ...overrides,
    });
}

describe("promoteStudentToAlumni (integration)", () => {
    it("creates a linked Alumni + User record for a graduated student", async () => {
        const student = await makeGraduatedStudent("GRAD-1");

        const { alumni, user } = await promoteStudentToAlumni(
            { studentId: student._id.toString() },
            { actor: admin }
        );

        expect(alumni.sourceStudentId.toString()).toBe(student._id.toString());
        expect(alumni.enrollmentNo).toBe("GRAD-1");
        expect(user.role).toBe("Alumni");
        expect(user.accountStatus).toBe("PendingActivation");
        expect(alumni.userId?.toString()).toBe(user._id.toString());
        expect(user.alumniId?.toString()).toBe(alumni._id.toString());
    });

    it("rejects promoting a student who has not graduated", async () => {
        const student = await Student.create({
            enrollmentNo: "ACTIVE-1",
            firstName: "Active",
            email: "active-1@example.com",
            departmentId: new Types.ObjectId(),
            programId: new Types.ObjectId(),
            admissionYear: 2023,
            status: "Active",
        });

        await expect(
            promoteStudentToAlumni({ studentId: student._id.toString() }, { actor: admin })
        ).rejects.toThrow(AuthError);
    });

    it("rejects promoting the same student twice", async () => {
        const student = await makeGraduatedStudent("GRAD-2");
        await promoteStudentToAlumni({ studentId: student._id.toString() }, { actor: admin });

        await expect(
            promoteStudentToAlumni({ studentId: student._id.toString() }, { actor: admin })
        ).rejects.toThrow(AuthError);
    });

    it("rejects promoting a student with no email on file", async () => {
        const student = await makeGraduatedStudent("GRAD-3", { email: undefined });

        await expect(
            promoteStudentToAlumni({ studentId: student._id.toString() }, { actor: admin })
        ).rejects.toThrow(AuthError);
    });
});

describe("promoteGraduatedStudentsBulk (integration)", () => {
    it("promotes every graduated student without an existing alumni record", async () => {
        const grad1 = await makeGraduatedStudent("BULK-1");
        const grad2 = await makeGraduatedStudent("BULK-2");
        const active = await Student.create({
            enrollmentNo: "BULK-ACTIVE",
            firstName: "Active",
            email: "bulk-active@example.com",
            departmentId: new Types.ObjectId(),
            programId: new Types.ObjectId(),
            admissionYear: 2023,
            status: "Active",
        });
        // Already promoted — must not be double-promoted or reported as failed.
        await promoteStudentToAlumni({ studentId: grad1._id.toString() }, { actor: admin });

        const result = await promoteGraduatedStudentsBulk({ actor: admin });

        expect(result.created).toHaveLength(1);
        expect(result.created[0].alumni.enrollmentNo).toBe("BULK-2");
        expect(result.failed).toHaveLength(0);
        expect(await Alumni.countDocuments({ sourceStudentId: grad2._id })).toBe(1);
        expect(await Alumni.countDocuments({ sourceStudentId: active._id })).toBe(0);
    });
});

describe("Alumni association and contributions (integration)", () => {
    it("creates the association on first upsert and updates it on the next call", async () => {
        const institutionId = new Types.ObjectId().toString();

        const created = await upsertAlumniAssociation(admin, {
            institutionId,
            name: "Alumni Association",
            isRegistered: true,
            isFunctional: true,
        });
        expect(created.isRegistered).toBe(true);

        const updated = await upsertAlumniAssociation(admin, {
            institutionId,
            name: "Alumni Association",
            isRegistered: true,
            isFunctional: false,
        });
        expect(updated._id.toString()).toBe(created._id.toString());
        expect(updated.isFunctional).toBe(false);
        expect(await AlumniAssociation.countDocuments({ institutionId })).toBe(1);
    });

    it("records a contribution linked to a real alumni record and rejects a bogus link", async () => {
        const student = await makeGraduatedStudent("CONTRIB-1");
        const { alumni } = await promoteStudentToAlumni({ studentId: student._id.toString() }, { actor: admin });
        const association = await upsertAlumniAssociation(admin, {
            institutionId: new Types.ObjectId().toString(),
            name: "Assoc",
        });

        const contribution = await createAlumniContribution(admin, {
            associationId: association._id.toString(),
            alumniId: alumni._id.toString(),
            alumniName: "Grad CONTRIB-1",
            contributionType: "Financial",
            contributionBand: "5To20Lakhs",
            contributionYear: 2024,
        });

        expect(contribution.alumniId?.toString()).toBe(alumni._id.toString());

        await expect(
            createAlumniContribution(admin, {
                associationId: association._id.toString(),
                alumniId: new Types.ObjectId().toString(),
                alumniName: "Ghost",
                contributionBand: "Below5Lakhs",
                contributionYear: 2024,
            })
        ).rejects.toThrow(AuthError);

        const listed = await listAlumniContributions(association._id.toString());
        expect(listed).toHaveLength(1);
    });
});
