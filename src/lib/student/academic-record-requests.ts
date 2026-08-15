import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { createAuditLog, type AuditActor, type AuditRequestContext } from "@/lib/audit/service";
import { AuthError } from "@/lib/auth/errors";
import { resolveAuthorizationProfile, resolveAuthorizedEvidenceDepartmentIds } from "@/lib/authorization/service";
import {
    notifyAcademicRecordEditRequestOutcome,
    notifyAcademicRecordEditRequestPending,
} from "@/lib/notifications/service";
import User from "@/models/core/user";
import Student from "@/models/student/student";
import StudentAcademicRecord from "@/models/student/student-academic-record";
import StudentAcademicRecordEditRequest, {
    type IAcademicRecordChangeSet,
} from "@/models/student/student-academic-record-edit-request";
import { academicRecordEditRequestSchema } from "./record-validators";

async function resolveStudent(userId: string) {
    const user = await User.findById(userId);
    if (!user || user.role !== "Student") {
        throw new AuthError("Student account not found.", 404);
    }
    const student =
        (user.studentId
            ? await Student.findById(user.studentId)
            : await Student.findOne({ userId: user._id })) ?? null;
    if (!student) {
        throw new AuthError("Student record not found.", 404);
    }
    return { user, student };
}

function snapshotChangeSet(
    record: { sgpa?: number; cgpa?: number; percentage?: number; rank?: number; resultStatus?: string },
    changedFields: IAcademicRecordChangeSet
): IAcademicRecordChangeSet {
    const snapshot: IAcademicRecordChangeSet = {};
    for (const key of Object.keys(changedFields) as Array<keyof IAcademicRecordChangeSet>) {
        (snapshot[key] as unknown) = record[key];
    }
    return snapshot;
}

export async function createAcademicRecordEditRequest(
    userId: string,
    academicRecordId: string,
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();
    const input = academicRecordEditRequestSchema.parse(rawInput);
    const { student } = await resolveStudent(userId);

    const academicRecord = await StudentAcademicRecord.findOne({
        _id: academicRecordId,
        studentId: student._id,
    });

    if (!academicRecord) {
        throw new AuthError("Academic record not found or does not belong to this student.", 404);
    }

    const existingPending = await StudentAcademicRecordEditRequest.findOne({
        academicRecordId: academicRecord._id,
        status: "Pending",
    });

    if (existingPending) {
        throw new AuthError("A correction request for this record is already pending review.", 409);
    }

    const previousValues = snapshotChangeSet(academicRecord, input.requestedChanges);

    const request = await StudentAcademicRecordEditRequest.create({
        studentId: student._id,
        academicRecordId: academicRecord._id,
        semesterId: academicRecord.semesterId,
        requestedChanges: input.requestedChanges,
        previousValues,
        reason: input.reason,
        status: "Pending",
    });

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "ACADEMIC_RECORD_EDIT_REQUEST_CREATE",
            tableName: "student_academic_record_edit_requests",
            recordId: request._id.toString(),
            newData: request,
            auditContext: options.auditContext,
        });
    }

    await notifyAcademicRecordEditRequestPending({
        departmentId: student.departmentId?.toString(),
        studentName: options?.actor?.name ?? "A student",
        entityId: request._id.toString(),
        actor: options?.actor ? { id: options.actor.id, name: options.actor.name } : undefined,
    });

    return request;
}

export async function getStudentAcademicRecordEditRequests(userId: string) {
    await dbConnect();
    const { student } = await resolveStudent(userId);

    return StudentAcademicRecordEditRequest.find({ studentId: student._id })
        .populate("semesterId", "semesterNumber")
        .sort({ createdAt: -1 })
        .lean();
}

export async function getAcademicRecordEditRequestQueue(actor: { id: string; name: string; role: string }) {
    await dbConnect();

    if (actor.role === "Admin") {
        return StudentAcademicRecordEditRequest.find({ status: "Pending" })
            .populate("studentId", "firstName lastName enrollmentNo departmentId")
            .populate("semesterId", "semesterNumber")
            .sort({ createdAt: -1 })
            .lean();
    }

    const profile = await resolveAuthorizationProfile(actor);
    const departmentIds = await resolveAuthorizedEvidenceDepartmentIds(profile);

    if (!departmentIds.length) {
        throw new AuthError("You do not have department scope access.", 403);
    }

    const pending = await StudentAcademicRecordEditRequest.find({ status: "Pending" })
        .populate("studentId", "firstName lastName enrollmentNo departmentId")
        .populate("semesterId", "semesterNumber")
        .sort({ createdAt: -1 })
        .lean();

    return pending.filter((request) => {
        const departmentId = (request.studentId as { departmentId?: { toString(): string } } | null)
            ?.departmentId;
        return departmentId ? departmentIds.includes(departmentId.toString()) : false;
    });
}

export async function reviewAcademicRecordEditRequest(
    actor: AuditActor & { id: string },
    requestId: string,
    decision: "Approve" | "Reject",
    remarks?: string,
    options?: { auditContext?: AuditRequestContext }
) {
    await dbConnect();

    const request = await StudentAcademicRecordEditRequest.findById(requestId);
    if (!request) {
        throw new AuthError("Correction request not found.", 404);
    }
    if (request.status !== "Pending") {
        throw new AuthError("This request has already been reviewed.", 409);
    }

    if (decision === "Approve") {
        const changes = JSON.parse(JSON.stringify(request.requestedChanges)) as IAcademicRecordChangeSet;
        const updated = await StudentAcademicRecord.findByIdAndUpdate(
            request.academicRecordId,
            { $set: changes },
            { returnDocument: "after" }
        );

        if (!updated) {
            throw new AuthError("The underlying academic record no longer exists.", 404);
        }
    }

    request.status = decision === "Approve" ? "Approved" : "Rejected";
    request.reviewedBy = new Types.ObjectId(actor.id);
    request.reviewedAt = new Date();
    request.reviewRemarks = remarks;
    await request.save();

    await createAuditLog({
        actor,
        action:
            decision === "Approve"
                ? "ACADEMIC_RECORD_EDIT_REQUEST_APPROVE"
                : "ACADEMIC_RECORD_EDIT_REQUEST_REJECT",
        tableName: "student_academic_record_edit_requests",
        recordId: request._id.toString(),
        newData: request,
        auditContext: options?.auditContext,
    });

    const studentUser = await User.findOne({ studentId: request.studentId }).select("_id");
    await notifyAcademicRecordEditRequestOutcome({
        userId: studentUser?._id?.toString(),
        entityId: request._id.toString(),
        decision,
        actor: { id: actor.id, name: actor.name },
    });

    return request;
}
