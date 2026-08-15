import { Types } from "mongoose";

import { clearDatabase, setupTestDatabase, teardownTestDatabase } from "@/test/db";
import User from "@/models/core/user";
import Student from "@/models/student/student";
import StudentPublication from "@/models/student/student-publication";
import AuditLog from "@/models/core/audit-log";
import { updateStudentRecord } from "@/lib/student/records-service";
import { AuthError } from "@/lib/auth/errors";

beforeAll(async () => {
    await setupTestDatabase();
});

afterAll(async () => {
    await teardownTestDatabase();
});

afterEach(async () => {
    await clearDatabase();
});

async function makeStudentUser(overrides: { enrollmentNo?: string } = {}) {
    const student = await Student.create({
        enrollmentNo: overrides.enrollmentNo ?? "ENR-1",
        firstName: "Asha",
        departmentId: new Types.ObjectId(),
        programId: new Types.ObjectId(),
        admissionYear: 2023,
    });

    const user = await User.create({
        name: "Asha Student",
        email: `${student.enrollmentNo.toLowerCase()}@example.com`,
        role: "Student",
        studentId: student._id,
    });

    return { user, student };
}

describe("updateStudentRecord (integration)", () => {
    it("updates a student's own record and writes an audit log entry", async () => {
        const { user, student } = await makeStudentUser();
        const publication = await StudentPublication.create({
            studentId: student._id,
            title: "Original Title",
            journalName: "Old Journal",
        });

        const updated = await updateStudentRecord(
            user._id.toString(),
            "publication",
            publication._id.toString(),
            { title: "Revised Title", journalName: "New Journal" },
            { actor: { id: user._id.toString(), name: user.name, role: user.role } }
        );

        expect((updated as { title: string }).title).toBe("Revised Title");

        const persisted = await StudentPublication.findById(publication._id).lean();
        expect(persisted?.journalName).toBe("New Journal");

        const auditEntry = await AuditLog.findOne({ action: "STUDENT_RECORD_UPDATE" }).lean();
        expect(auditEntry).not.toBeNull();
        expect(auditEntry?.recordId).toBe(publication._id.toString());
    });

    it("rejects updating a record that belongs to another student", async () => {
        const { student: owner } = await makeStudentUser({ enrollmentNo: "ENR-1" });
        const { user: otherUser } = await makeStudentUser({ enrollmentNo: "ENR-2" });
        const publication = await StudentPublication.create({
            studentId: owner._id,
            title: "Owner's Title",
        });

        await expect(
            updateStudentRecord(
                otherUser._id.toString(),
                "publication",
                publication._id.toString(),
                { title: "Hijacked Title" }
            )
        ).rejects.toThrow(AuthError);

        const persisted = await StudentPublication.findById(publication._id).lean();
        expect(persisted?.title).toBe("Owner's Title");
    });

    it("rejects the academic record type — grade edits go through the request flow", async () => {
        const { user } = await makeStudentUser();

        await expect(
            updateStudentRecord(user._id.toString(), "academic", new Types.ObjectId().toString(), {
                sgpa: 9,
            })
        ).rejects.toThrow(AuthError);
    });
});
