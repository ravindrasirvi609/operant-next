import { Types } from "mongoose";

import { clearDatabase, setupTestDatabase, teardownTestDatabase } from "@/test/db";
import User from "@/models/core/user";
import Student from "@/models/student/student";
import Semester from "@/models/reference/semester";
import StudentAcademicRecord from "@/models/student/student-academic-record";
import StudentAcademicRecordEditRequest from "@/models/student/student-academic-record-edit-request";
import AuditLog from "@/models/core/audit-log";
import { AuthError } from "@/lib/auth/errors";
import {
    createAcademicRecordEditRequest,
    getAcademicRecordEditRequestQueue,
    getStudentAcademicRecordEditRequests,
    reviewAcademicRecordEditRequest,
} from "@/lib/student/academic-record-requests";

beforeAll(async () => {
    await setupTestDatabase();
});

afterAll(async () => {
    await teardownTestDatabase();
});

afterEach(async () => {
    await clearDatabase();
});

async function makeStudentWithAcademicRecord(
    overrides: { enrollmentNo?: string; sgpa?: number; semesterNumber?: number } = {}
) {
    const semester = await Semester.create({ semesterNumber: overrides.semesterNumber ?? 1 });
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
    const academicRecord = await StudentAcademicRecord.create({
        studentId: student._id,
        semesterId: semester._id,
        sgpa: overrides.sgpa ?? 7,
        resultStatus: "Pass",
    });

    return { user, student, academicRecord, semester };
}

async function makeAdmin() {
    return User.create({ name: "Admin User", email: "admin@example.com", role: "Admin" });
}

describe("createAcademicRecordEditRequest (integration)", () => {
    it("creates a pending request with a snapshot of the previous values", async () => {
        const { user, academicRecord } = await makeStudentWithAcademicRecord({ sgpa: 7 });

        const request = await createAcademicRecordEditRequest(
            user._id.toString(),
            academicRecord._id.toString(),
            { requestedChanges: { sgpa: 8.5 }, reason: "SGPA was miscalculated." },
            { actor: { id: user._id.toString(), name: user.name, role: user.role } }
        );

        expect(request.status).toBe("Pending");
        expect(request.previousValues.sgpa).toBe(7);
        expect(request.requestedChanges.sgpa).toBe(8.5);
        expect(await StudentAcademicRecordEditRequest.countDocuments()).toBe(1);

        const persistedRecord = await StudentAcademicRecord.findById(academicRecord._id).lean();
        expect(persistedRecord?.sgpa).toBe(7);

        const auditEntry = await AuditLog.findOne({ action: "ACADEMIC_RECORD_EDIT_REQUEST_CREATE" }).lean();
        expect(auditEntry).not.toBeNull();
    });

    it("rejects a second pending request for the same academic record", async () => {
        const { user, academicRecord } = await makeStudentWithAcademicRecord();

        await createAcademicRecordEditRequest(user._id.toString(), academicRecord._id.toString(), {
            requestedChanges: { sgpa: 8 },
            reason: "First request.",
        });

        await expect(
            createAcademicRecordEditRequest(user._id.toString(), academicRecord._id.toString(), {
                requestedChanges: { sgpa: 9 },
                reason: "Second request.",
            })
        ).rejects.toThrow(AuthError);
    });

    it("rejects a request for an academic record that does not belong to the student", async () => {
        const { academicRecord } = await makeStudentWithAcademicRecord({ enrollmentNo: "ENR-1" });
        const { user: otherUser } = await makeStudentWithAcademicRecord({
            enrollmentNo: "ENR-2",
            semesterNumber: 2,
        });

        await expect(
            createAcademicRecordEditRequest(otherUser._id.toString(), academicRecord._id.toString(), {
                requestedChanges: { sgpa: 9 },
                reason: "Not mine.",
            })
        ).rejects.toThrow(AuthError);
    });
});

describe("reviewAcademicRecordEditRequest (integration)", () => {
    it("approve applies the requested changes to the academic record", async () => {
        const { user, academicRecord } = await makeStudentWithAcademicRecord({ sgpa: 7 });
        const admin = await makeAdmin();
        const request = await createAcademicRecordEditRequest(user._id.toString(), academicRecord._id.toString(), {
            requestedChanges: { sgpa: 8.5, resultStatus: "Pass" },
            reason: "Recount.",
        });

        const reviewed = await reviewAcademicRecordEditRequest(
            { id: admin._id.toString(), name: admin.name, role: admin.role },
            request._id.toString(),
            "Approve"
        );

        expect(reviewed.status).toBe("Approved");
        expect(reviewed.reviewedBy?.toString()).toBe(admin._id.toString());

        const persistedRecord = await StudentAcademicRecord.findById(academicRecord._id).lean();
        expect(persistedRecord?.sgpa).toBe(8.5);

        const auditEntry = await AuditLog.findOne({ action: "ACADEMIC_RECORD_EDIT_REQUEST_APPROVE" }).lean();
        expect(auditEntry).not.toBeNull();
    });

    it("reject leaves the academic record unchanged and records remarks", async () => {
        const { user, academicRecord } = await makeStudentWithAcademicRecord({ sgpa: 7 });
        const admin = await makeAdmin();
        const request = await createAcademicRecordEditRequest(user._id.toString(), academicRecord._id.toString(), {
            requestedChanges: { sgpa: 9 },
            reason: "Recount.",
        });

        const reviewed = await reviewAcademicRecordEditRequest(
            { id: admin._id.toString(), name: admin.name, role: admin.role },
            request._id.toString(),
            "Reject",
            "Grades verified as correct."
        );

        expect(reviewed.status).toBe("Rejected");
        expect(reviewed.reviewRemarks).toBe("Grades verified as correct.");

        const persistedRecord = await StudentAcademicRecord.findById(academicRecord._id).lean();
        expect(persistedRecord?.sgpa).toBe(7);
    });

    it("rejects reviewing a request that is no longer pending", async () => {
        const { user, academicRecord } = await makeStudentWithAcademicRecord();
        const admin = await makeAdmin();
        const request = await createAcademicRecordEditRequest(user._id.toString(), academicRecord._id.toString(), {
            requestedChanges: { sgpa: 8 },
            reason: "Recount.",
        });
        const adminActor = { id: admin._id.toString(), name: admin.name, role: admin.role };
        await reviewAcademicRecordEditRequest(adminActor, request._id.toString(), "Approve");

        await expect(
            reviewAcademicRecordEditRequest(adminActor, request._id.toString(), "Approve")
        ).rejects.toThrow(AuthError);
    });
});

describe("getStudentAcademicRecordEditRequests (integration)", () => {
    it("returns only the requesting student's own requests", async () => {
        const { user, academicRecord } = await makeStudentWithAcademicRecord({ enrollmentNo: "ENR-1" });
        const { user: otherUser, academicRecord: otherRecord } = await makeStudentWithAcademicRecord({
            enrollmentNo: "ENR-2",
            semesterNumber: 2,
        });
        await createAcademicRecordEditRequest(user._id.toString(), academicRecord._id.toString(), {
            requestedChanges: { sgpa: 8 },
            reason: "Mine.",
        });
        await createAcademicRecordEditRequest(otherUser._id.toString(), otherRecord._id.toString(), {
            requestedChanges: { sgpa: 8 },
            reason: "Not mine.",
        });

        const requests = await getStudentAcademicRecordEditRequests(user._id.toString());

        expect(requests).toHaveLength(1);
        expect(requests[0].reason).toBe("Mine.");
    });
});

describe("getAcademicRecordEditRequestQueue (integration)", () => {
    it("returns pending requests for an Admin actor regardless of department", async () => {
        const { user, academicRecord } = await makeStudentWithAcademicRecord();
        const admin = await makeAdmin();
        await createAcademicRecordEditRequest(user._id.toString(), academicRecord._id.toString(), {
            requestedChanges: { sgpa: 8 },
            reason: "Recount.",
        });

        const queue = await getAcademicRecordEditRequestQueue({
            id: admin._id.toString(),
            name: admin.name,
            role: admin.role,
        });

        expect(queue).toHaveLength(1);
        expect(queue[0].status).toBe("Pending");
    });
});
