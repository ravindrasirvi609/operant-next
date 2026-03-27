import { Types } from "mongoose";

import { createAuditLog, type AuditRequestContext } from "@/lib/audit/service";
import {
    resolveAuthorizationProfile,
    resolveAuthorizedEvidenceDepartmentIds,
} from "@/lib/authorization/service";
import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import { notifyUser } from "@/lib/notifications/service";
import DocumentModel from "@/models/reference/document";
import Student from "@/models/student/student";
import StudentAward from "@/models/student/student-award";
import StudentSkill from "@/models/student/student-skill";
import StudentSport from "@/models/student/student-sport";
import StudentCulturalParticipation from "@/models/student/student-cultural-participation";
import StudentEventParticipation from "@/models/student/student-event-participation";
import StudentSocialParticipation from "@/models/student/student-social-participation";
import StudentPublication from "@/models/student/student-publication";
import StudentResearchProject from "@/models/student/student-research-project";
import Internship from "@/models/student/internship";

type SafeActor = {
    id: string;
    name: string;
    role: string;
    auditContext?: AuditRequestContext;
};

type EvidenceStatus = "Pending" | "Verified" | "Rejected" | "All";

type EvidenceItem = {
    recordType: string;
    recordId: string;
    summary: string;
    submittedAt?: Date;
    student: {
        id: string;
        name: string;
        enrollmentNo: string;
        departmentName?: string;
        programName?: string;
    };
    document: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        fileType?: string;
        uploadedAt?: Date;
        verificationStatus?: string;
        verificationRemarks?: string;
    };
};

export type EvidenceDashboardSummary = {
    totalItems: number;
    pendingCount: number;
    verifiedCount: number;
    rejectedCount: number;
    departmentCount: number;
    recentUploadsCount: number;
    stalePendingCount: number;
    recordTypeBreakdown: Array<{
        label: string;
        count: number;
    }>;
    departmentBreakdown: Array<{
        label: string;
        count: number;
        pendingCount: number;
    }>;
};

async function getAuthorizedEvidenceDepartmentIds(actor: SafeActor) {
    const profile = await resolveAuthorizationProfile(actor);
    const departmentIds = await resolveAuthorizedEvidenceDepartmentIds(profile);

    if (!departmentIds.length) {
        throw new AuthError("You do not have evidence review access.", 403);
    }

    return departmentIds;
}

function normalizeStudentName(student: { firstName?: string; lastName?: string }) {
    return [student.firstName, student.lastName].filter(Boolean).join(" ");
}

function buildDocumentMatch(status: EvidenceStatus) {
    if (!status || status === "All") return undefined;
    return { verificationStatus: status };
}

function populateStudent(query: any) {
    return query.populate({
        path: "studentId",
        select: "firstName lastName enrollmentNo departmentId programId",
        populate: [
            { path: "departmentId", select: "name" },
            { path: "programId", select: "name" },
        ],
    });
}

function mapEvidenceItem(
    recordType: string,
    record: any,
    summary: string,
): EvidenceItem | null {
    if (!record?.documentId || !record?.studentId) return null;
    const student = record.studentId;
    const document = record.documentId;

    return {
        recordType,
        recordId: record._id.toString(),
        summary,
        submittedAt: record.createdAt,
        student: {
            id: student._id.toString(),
            name: normalizeStudentName(student),
            enrollmentNo: student.enrollmentNo,
            departmentName: student.departmentId?.name,
            programName: student.programId?.name,
        },
        document: {
            id: document._id?.toString(),
            fileName: document.fileName,
            fileUrl: document.fileUrl,
            fileType: document.fileType,
            uploadedAt: document.uploadedAt,
            verificationStatus: document.verificationStatus,
            verificationRemarks: document.verificationRemarks,
        },
    };
}

export async function listStudentEvidenceForReview(
    actor: SafeActor,
    status: EvidenceStatus = "Pending"
) {
    await dbConnect();
    const departmentScopes = await getAuthorizedEvidenceDepartmentIds(actor);
    const match = buildDocumentMatch(status);

    const basePopulate = {
        path: "documentId",
        select: "fileName fileUrl fileType uploadedAt verificationStatus verificationRemarks",
        ...(match ? { match } : {}),
    };

    const [
        awards,
        skills,
        sports,
        cultural,
        events,
        social,
        publications,
        research,
        internships,
    ] = await Promise.all([
        populateStudent(
            StudentAward.find({ documentId: { $exists: true, $ne: null } })
                .populate("awardId", "title category level")
                .populate(basePopulate)
        ).lean(),
        populateStudent(
            StudentSkill.find({ documentId: { $exists: true, $ne: null } })
                .populate("skillId", "name category")
                .populate(basePopulate)
        ).lean(),
        populateStudent(
            StudentSport.find({ documentId: { $exists: true, $ne: null } })
                .populate("sportId", "sportName")
                .populate(basePopulate)
        ).lean(),
        populateStudent(
            StudentCulturalParticipation.find({ documentId: { $exists: true, $ne: null } })
                .populate("activityId", "name category")
                .populate(basePopulate)
        ).lean(),
        populateStudent(
            StudentEventParticipation.find({ documentId: { $exists: true, $ne: null } })
                .populate("eventId", "title eventType organizedBy startDate")
                .populate(basePopulate)
        ).lean(),
        populateStudent(
            StudentSocialParticipation.find({ documentId: { $exists: true, $ne: null } })
                .populate("programId", "name type")
                .populate(basePopulate)
        ).lean(),
        populateStudent(
            StudentPublication.find({ documentId: { $exists: true, $ne: null } })
                .populate(basePopulate)
        ).lean(),
        populateStudent(
            StudentResearchProject.find({ documentId: { $exists: true, $ne: null } })
                .populate(basePopulate)
        ).lean(),
        populateStudent(
            Internship.find({ documentId: { $exists: true, $ne: null } })
                .populate(basePopulate)
        ).lean(),
    ]);

    const items = [
        ...awards.map((record: any) =>
            mapEvidenceItem(
                "award",
                record,
                `${record.awardId?.title ?? "Award"}${record.awardDate ? ` • ${record.awardDate}` : ""}`
            )
        ),
        ...skills.map((record: any) =>
            mapEvidenceItem(
                "skill",
                record,
                `${record.skillId?.name ?? "Skill"}${record.provider ? ` • ${record.provider}` : ""}`
            )
        ),
        ...sports.map((record: any) =>
            mapEvidenceItem(
                "sport",
                record,
                `${record.sportId?.sportName ?? "Sport"}${record.eventName ? ` • ${record.eventName}` : ""}`
            )
        ),
        ...cultural.map((record: any) =>
            mapEvidenceItem(
                "cultural",
                record,
                `${record.activityId?.name ?? "Activity"}${record.eventName ? ` • ${record.eventName}` : ""}`
            )
        ),
        ...events.map((record: any) =>
            mapEvidenceItem(
                "event",
                record,
                `${record.eventId?.title ?? "Event"}${record.role ? ` • ${record.role}` : ""}`
            )
        ),
        ...social.map((record: any) =>
            mapEvidenceItem(
                "social",
                record,
                `${record.programId?.name ?? "Program"}${record.activityName ? ` • ${record.activityName}` : ""}`
            )
        ),
        ...publications.map((record: any) =>
            mapEvidenceItem(
                "publication",
                record,
                `${record.title}${record.publicationType ? ` • ${record.publicationType}` : ""}`
            )
        ),
        ...research.map((record: any) =>
            mapEvidenceItem(
                "research",
                record,
                `${record.title}${record.status ? ` • ${record.status}` : ""}`
            )
        ),
        ...internships.map((record: any) =>
            mapEvidenceItem(
                "internship",
                record,
                `${record.companyName}${record.role ? ` • ${record.role}` : ""}`
            )
        ),
    ].filter(Boolean) as EvidenceItem[];

    const allowedStudents = await Student.find({
        departmentId: { $in: departmentScopes.map((departmentId) => new Types.ObjectId(departmentId)) },
    })
        .select("_id")
        .lean();
    const allowedIds = new Set(allowedStudents.map((student) => student._id.toString()));

    return items
        .filter((item) => allowedIds.has(item.student.id))
        .sort((a, b) => (b.document.uploadedAt?.getTime() ?? 0) - (a.document.uploadedAt?.getTime() ?? 0));
}

export async function getEvidenceDashboardSummary(actor: SafeActor): Promise<EvidenceDashboardSummary> {
    const items = await listStudentEvidenceForReview(actor, "All");
    const now = Date.now();
    const recordTypeCounts = new Map<string, number>();
    const departmentCounts = new Map<string, { count: number; pendingCount: number }>();

    for (const item of items) {
        const recordKey = item.recordType || "other";
        recordTypeCounts.set(recordKey, (recordTypeCounts.get(recordKey) ?? 0) + 1);

        const departmentKey = item.student.departmentName?.trim() || "Unassigned";
        const current = departmentCounts.get(departmentKey) ?? { count: 0, pendingCount: 0 };
        current.count += 1;
        if (item.document.verificationStatus === "Pending") {
            current.pendingCount += 1;
        }
        departmentCounts.set(departmentKey, current);
    }

    return {
        totalItems: items.length,
        pendingCount: items.filter((item) => item.document.verificationStatus === "Pending").length,
        verifiedCount: items.filter((item) => item.document.verificationStatus === "Verified").length,
        rejectedCount: items.filter((item) => item.document.verificationStatus === "Rejected").length,
        departmentCount: new Set(
            items.map((item) => item.student.departmentName?.trim()).filter(Boolean)
        ).size,
        recentUploadsCount: items.filter((item) => {
            const uploadedAt = item.document.uploadedAt ? new Date(item.document.uploadedAt).getTime() : 0;
            return uploadedAt >= now - 7 * 24 * 60 * 60 * 1000;
        }).length,
        stalePendingCount: items.filter((item) => {
            if (item.document.verificationStatus !== "Pending" || !item.document.uploadedAt) {
                return false;
            }

            return new Date(item.document.uploadedAt).getTime() < now - 7 * 24 * 60 * 60 * 1000;
        }).length,
        recordTypeBreakdown: Array.from(recordTypeCounts.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
        departmentBreakdown: Array.from(departmentCounts.entries())
            .map(([label, counts]) => ({
                label,
                count: counts.count,
                pendingCount: counts.pendingCount,
            }))
            .sort((left, right) => right.pendingCount - left.pendingCount || right.count - left.count),
    };
}

async function ensureStudentEvidence(documentId: string, departmentIds: string[]) {
    const query = { documentId: new Types.ObjectId(documentId) };
    const studentFilter = departmentIds.length
        ? {
              studentId: {
                  $in: (
                      await Student.find({
                          departmentId: { $in: departmentIds.map((departmentId) => new Types.ObjectId(departmentId)) },
                      })
                          .select("_id")
                          .lean()
                  ).map((student) => student._id),
              },
          }
        : {};

    const matches = await Promise.all([
        StudentAward.exists({ ...query, ...studentFilter }),
        StudentSkill.exists({ ...query, ...studentFilter }),
        StudentSport.exists({ ...query, ...studentFilter }),
        StudentCulturalParticipation.exists({ ...query, ...studentFilter }),
        StudentEventParticipation.exists({ ...query, ...studentFilter }),
        StudentSocialParticipation.exists({ ...query, ...studentFilter }),
        StudentPublication.exists({ ...query, ...studentFilter }),
        StudentResearchProject.exists({ ...query, ...studentFilter }),
        Internship.exists({ ...query, ...studentFilter }),
    ]);
    return matches.some(Boolean);
}

export async function updateEvidenceVerification(
    actor: SafeActor,
    documentId: string,
    status: "Verified" | "Rejected",
    remarks?: string
) {
    await dbConnect();
    const departmentScopes = await getAuthorizedEvidenceDepartmentIds(actor);

    const isStudentEvidence = await ensureStudentEvidence(documentId, departmentScopes);
    if (!isStudentEvidence) {
        throw new AuthError("Evidence record not found for student modules.", 404);
    }

    const document = await DocumentModel.findById(documentId);
    if (!document) {
        throw new AuthError("Document not found.", 404);
    }

    const oldState = document.toObject();
    const previousStatus = document.verificationStatus;

    document.verificationStatus = status;
    document.verified = status === "Verified";
    document.verifiedBy = new Types.ObjectId(actor.id);
    document.verifiedAt = new Date();
    document.verificationRemarks = remarks?.trim() || undefined;

    await document.save();

    await createAuditLog({
        actor,
        action: status === "Verified" ? "EVIDENCE_VERIFY" : "EVIDENCE_REJECT",
        tableName: "documents",
        recordId: document._id.toString(),
        oldData: oldState,
        newData: document.toObject(),
        auditContext: actor.auditContext,
    });

    if (document.uploadedBy && previousStatus !== status) {
        await notifyUser({
            userId: document.uploadedBy.toString(),
            kind: "document",
            moduleName: "EVIDENCE",
            entityId: document._id.toString(),
            href: "/student/records",
            title: status === "Verified" ? "Evidence verified" : "Evidence returned for changes",
            message:
                status === "Verified"
                    ? `${actor.name} verified your uploaded evidence document.`
                    : `${actor.name} rejected your uploaded evidence document${remarks?.trim() ? ` with remarks: ${remarks.trim()}` : "."}`,
            actor,
            metadata: {
                reviewStatus: status,
                verificationRemarks: remarks?.trim() || undefined,
            },
        });
    }

    return document;
}
