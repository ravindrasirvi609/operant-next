import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import Organization from "@/models/core/organization";
import User from "@/models/core/user";
import PbasApplication, { type PbasStatus } from "@/models/core/pbas-application";
import { pbasApplicationSchema, pbasApprovalSchema, pbasReviewSchema } from "@/lib/pbas/validators";
import { syncEvidenceFromPbas } from "@/lib/faculty-evidence/service";

type SafeActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
};

function scoreResearchPaper(indexing?: string) {
    const value = (indexing ?? "").toLowerCase();

    if (value.includes("scopus") || value.includes("ugc care") || value.includes("web of science")) {
        return 15;
    }

    if (value.includes("peer") || value.includes("issn")) {
        return 10;
    }

    return 6;
}

function scorePatent(status?: string) {
    const value = (status ?? "").toLowerCase();

    if (value.includes("granted")) {
        return 20;
    }

    if (value.includes("published")) {
        return 12;
    }

    return 8;
}

function scoreConference(type?: string) {
    const value = (type ?? "").toLowerCase();

    if (value.includes("international")) {
        return 8;
    }

    if (value.includes("national")) {
        return 5;
    }

    return 3;
}

function scoreProject(amount: number) {
    if (amount >= 1000000) {
        return 15;
    }

    if (amount >= 250000) {
        return 10;
    }

    return 6;
}

export function computePbasApiScore(input: ReturnType<typeof pbasApplicationSchema.parse>) {
    const teachingActivities = Math.min(
        100,
        input.category1.classesTaken * 2 +
            input.category1.coursePreparationHours * 0.4 +
            input.category1.coursesTaught.length * 4 +
            input.category1.mentoringCount * 3 +
            input.category1.labSupervisionCount * 3
    );

    const researchAcademicContribution = Math.min(
        120,
        input.category2.researchPapers.reduce(
            (sum, paper) => sum + scoreResearchPaper(paper.indexing),
            0
        ) +
            input.category2.books.length * 18 +
            input.category2.patents.reduce((sum, patent) => sum + scorePatent(patent.status), 0) +
            input.category2.conferences.reduce(
                (sum, conference) => sum + scoreConference(conference.type),
                0
            ) +
            input.category2.projects.reduce((sum, project) => sum + scoreProject(project.amount), 0)
    );

    const institutionalResponsibilities = Math.min(
        80,
        input.category3.committees.length * 4 +
            input.category3.administrativeDuties.length * 5 +
            input.category3.examDuties.length * 3 +
            input.category3.studentGuidance.reduce((sum, entry) => sum + Math.min(entry.count, 10), 0) +
            input.category3.extensionActivities.length * 4
    );

    return {
        teachingActivities,
        researchAcademicContribution,
        institutionalResponsibilities,
        totalScore:
            teachingActivities + researchAcademicContribution + institutionalResponsibilities,
    };
}

async function getDepartmentHeadedByUser(userId: string) {
    return Organization.findOne({
        type: "Department",
        headUserId: userId,
        isActive: true,
    }).select("name");
}

function pushStatusLog(
    application: InstanceType<typeof PbasApplication>,
    status: PbasStatus,
    actor?: SafeActor,
    remarks?: string
) {
    application.statusLogs.push({
        status,
        actorId: actor ? new Types.ObjectId(actor.id) : undefined,
        actorName: actor?.name,
        actorRole: actor?.role,
        remarks,
        changedAt: new Date(),
    });
}

async function getUserForApplication(application: InstanceType<typeof PbasApplication>) {
    const faculty = await User.findById(application.facultyId).select(
        "name email role department designation universityName collegeName"
    );

    if (!faculty) {
        throw new AuthError("Faculty account not found.", 404);
    }

    return faculty;
}

export async function createPbasApplication(actor: SafeActor, rawInput: unknown) {
    const input = pbasApplicationSchema.parse(rawInput);
    await dbConnect();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can create PBAS applications.", 403);
    }

    const apiScore = computePbasApiScore(input);

    const application = await PbasApplication.create({
        facultyId: new Types.ObjectId(actor.id),
        academicYear: input.academicYear,
        currentDesignation: input.currentDesignation,
        appraisalPeriod: input.appraisalPeriod,
        category1: input.category1,
        category2: input.category2,
        category3: input.category3,
        apiScore,
        reviewCommittee: [],
        statusLogs: [
            {
                status: "Draft",
                actorId: new Types.ObjectId(actor.id),
                actorName: actor.name,
                actorRole: actor.role,
                remarks: "PBAS application draft created.",
                changedAt: new Date(),
            },
        ],
        status: "Draft",
    });

    await syncEvidenceFromPbas(actor.id, input);

    return application;
}

export async function getFacultyPbasApplications(actor: SafeActor) {
    await dbConnect();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can view their PBAS applications.", 403);
    }

    return PbasApplication.find({ facultyId: actor.id }).sort({ updatedAt: -1 });
}

export async function getPbasApplicationById(actor: SafeActor, id: string) {
    await dbConnect();

    if (!Types.ObjectId.isValid(id)) {
        throw new AuthError("PBAS application not found.", 404);
    }

    const application = await PbasApplication.findById(id);

    if (!application) {
        throw new AuthError("PBAS application not found.", 404);
    }

    if (actor.role === "Admin") {
        return application;
    }

    if (actor.role === "Faculty" && application.facultyId.toString() === actor.id) {
        return application;
    }

    const headedDepartment = await getDepartmentHeadedByUser(actor.id);

    if (headedDepartment) {
        const faculty = await getUserForApplication(application);
        if (faculty.department === headedDepartment.name) {
            return application;
        }
    }

    throw new AuthError("You do not have access to this PBAS application.", 403);
}

export async function updatePbasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = pbasApplicationSchema.parse(rawInput);
    const application = await getPbasApplicationById(actor, id);

    if (actor.role !== "Faculty" || application.facultyId.toString() !== actor.id) {
        throw new AuthError("Only the faculty owner can update this PBAS application.", 403);
    }

    if (!["Draft", "Rejected"].includes(application.status)) {
        throw new AuthError("Only draft or rejected PBAS applications can be edited.", 409);
    }

    application.academicYear = input.academicYear;
    application.currentDesignation = input.currentDesignation;
    application.appraisalPeriod = input.appraisalPeriod;
    application.category1 = input.category1;
    application.category2 = input.category2;
    application.category3 = input.category3;
    application.apiScore = computePbasApiScore(input);

    pushStatusLog(application, application.status, actor, "PBAS application draft auto-saved.");
    await application.save();
    await syncEvidenceFromPbas(actor.id, input);

    return application;
}

export async function deletePbasApplication(actor: SafeActor, id: string) {
    await dbConnect();

    if (!Types.ObjectId.isValid(id)) {
        throw new AuthError("PBAS application not found.", 404);
    }

    if (actor.role !== "Faculty") {
        throw new AuthError("Only the faculty owner can delete this PBAS application.", 403);
    }

    const application = await PbasApplication.findOne({ _id: id, facultyId: actor.id });

    if (!application) {
        throw new AuthError("PBAS application not found.", 404);
    }

    if (application.status !== "Draft") {
        throw new AuthError("Only draft PBAS applications can be deleted.", 409);
    }

    await PbasApplication.deleteOne({ _id: application._id });

    return application;
}

export async function submitPbasApplication(actor: SafeActor, id: string) {
    const application = await getPbasApplicationById(actor, id);

    if (actor.role !== "Faculty" || application.facultyId.toString() !== actor.id) {
        throw new AuthError("Only the faculty owner can submit this PBAS application.", 403);
    }

    if (!["Draft", "Rejected"].includes(application.status)) {
        throw new AuthError("Only draft or rejected applications can be submitted.", 409);
    }

    if (application.apiScore.totalScore <= 0) {
        throw new AuthError("PBAS application must contain academic activity before submission.", 400);
    }

    application.status = "Submitted";
    application.submittedAt = new Date();
    pushStatusLog(application, "Submitted", actor, "Faculty submitted PBAS application.");
    await application.save();

    return application;
}

export async function reviewPbasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = pbasReviewSchema.parse(rawInput);
    const application = await getPbasApplicationById(actor, id);

    const faculty = await getUserForApplication(application);
    const headedDepartment = await getDepartmentHeadedByUser(actor.id);
    const isDepartmentHead =
        Boolean(headedDepartment) && faculty.department === headedDepartment?.name;
    const isCommitteeReviewer = actor.role === "Admin" || actor.role === "Director";

    if (!isDepartmentHead && !isCommitteeReviewer) {
        throw new AuthError("You are not authorized to review this PBAS application.", 403);
    }

    if (input.decision === "Reject") {
        application.status = "Rejected";
        application.reviewCommittee.push({
            reviewerId: new Types.ObjectId(actor.id),
            reviewerName: actor.name,
            reviewerRole: actor.role,
            designation: actor.role === "Admin" ? "Admin Reviewer" : "Department Head",
            remarks: input.remarks,
            decision: input.decision,
            stage: isDepartmentHead ? "Department Head" : "PBAS Committee",
            reviewedAt: new Date(),
        });
        pushStatusLog(application, "Rejected", actor, input.remarks);
        await application.save();

        return application;
    }

    const nextStatus: PbasStatus =
        application.status === "Submitted" ? "Under Review" : "Committee Review";

    application.status = nextStatus;
    application.reviewCommittee.push({
        reviewerId: new Types.ObjectId(actor.id),
        reviewerName: actor.name,
        reviewerRole: actor.role,
        designation:
            nextStatus === "Under Review"
                ? "Department Head Reviewer"
                : "PBAS Committee Reviewer",
        remarks: input.remarks,
        decision: input.decision,
        stage: nextStatus === "Under Review" ? "Department Head" : "PBAS Committee",
        reviewedAt: new Date(),
    });
    pushStatusLog(application, nextStatus, actor, input.remarks);
    await application.save();

    return application;
}

export async function approvePbasApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = pbasApprovalSchema.parse(rawInput);

    if (actor.role !== "Admin") {
        throw new AuthError("Only admin users can finalize PBAS approval.", 403);
    }

    const application = await getPbasApplicationById(actor, id);

    application.status = input.decision === "Approve" ? "Approved" : "Rejected";
    application.reviewCommittee.push({
        reviewerId: new Types.ObjectId(actor.id),
        reviewerName: actor.name,
        reviewerRole: actor.role,
        designation: "Admin Final Approver",
        remarks: input.remarks,
        decision: input.decision,
        stage: "Admin",
        reviewedAt: new Date(),
    });
    pushStatusLog(application, application.status, actor, input.remarks);
    await application.save();

    return application;
}

export async function getPbasReviewQueue(actor: SafeActor) {
    await dbConnect();

    if (actor.role === "Admin") {
        return PbasApplication.find({
            status: { $in: ["Under Review", "Committee Review", "Submitted"] },
        }).sort({ updatedAt: -1 });
    }

    const headedDepartment = await getDepartmentHeadedByUser(actor.id);

    if (!headedDepartment) {
        return [];
    }

    const facultyUsers = await User.find({ department: headedDepartment.name, role: "Faculty" }).select("_id");

    return PbasApplication.find({
        facultyId: { $in: facultyUsers.map((item) => item._id) },
        status: { $in: ["Submitted", "Under Review"] },
    }).sort({ updatedAt: -1 });
}

export async function getPbasReportsForCas(facultyId: string) {
    await dbConnect();

    return PbasApplication.find({
        facultyId,
        status: { $in: ["Submitted", "Under Review", "Committee Review", "Approved"] },
    })
        .select("academicYear apiScore status")
        .sort({ academicYear: -1, updatedAt: -1 });
}

export async function getPbasReportsByIdsForFaculty(facultyId: string, ids: string[]) {
    await dbConnect();

    if (!ids.length) {
        return [];
    }

    return PbasApplication.find({
        _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
        facultyId,
        status: { $in: ["Submitted", "Under Review", "Committee Review", "Approved"] },
    }).select("apiScore academicYear status");
}
