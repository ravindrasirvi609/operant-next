import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import { ensureFacultyContext } from "@/lib/faculty/migration";
import Organization from "@/models/core/organization";
import Department from "@/models/reference/department";
import Faculty from "@/models/faculty/faculty";
import User from "@/models/core/user";
import AqarApplication, { type AqarStatus } from "@/models/core/aqar-application";
import { aqarApplicationSchema, aqarApprovalSchema, aqarReviewSchema } from "@/lib/aqar/validators";
import { syncEvidenceFromAqar } from "@/lib/faculty-evidence/service";

type SafeActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
};

export function computeAqarMetrics(input: ReturnType<typeof aqarApplicationSchema.parse>) {
    const researchPaperCount = input.facultyContribution.researchPapers.length;
    const seedMoneyProjectCount = input.facultyContribution.seedMoneyProjects.length;
    const awardRecognitionCount = input.facultyContribution.awardsRecognition.length;
    const fellowshipCount = input.facultyContribution.fellowships.length;
    const researchFellowCount = input.facultyContribution.researchFellows.length;
    const patentCount = input.facultyContribution.patents.length;
    const phdAwardCount = input.facultyContribution.phdAwards.length;
    const bookChapterCount = input.facultyContribution.booksChapters.length;
    const eContentCount = input.facultyContribution.eContentDeveloped.length;
    const consultancyCount = input.facultyContribution.consultancyServices.length;
    const financialSupportCount = input.facultyContribution.financialSupport.length;
    const fdpCount = input.facultyContribution.facultyDevelopmentProgrammes.length;

    const totalContributionIndex =
        researchPaperCount * 5 +
        seedMoneyProjectCount * 5 +
        awardRecognitionCount * 4 +
        fellowshipCount * 4 +
        researchFellowCount * 3 +
        patentCount * 5 +
        phdAwardCount * 5 +
        bookChapterCount * 4 +
        eContentCount * 3 +
        consultancyCount * 4 +
        financialSupportCount * 2 +
        fdpCount * 2;

    return {
        researchPaperCount,
        seedMoneyProjectCount,
        awardRecognitionCount,
        fellowshipCount,
        researchFellowCount,
        patentCount,
        phdAwardCount,
        bookChapterCount,
        eContentCount,
        consultancyCount,
        financialSupportCount,
        fdpCount,
        totalContributionIndex,
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
    application: InstanceType<typeof AqarApplication>,
    status: AqarStatus,
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

async function getUserForApplication(application: InstanceType<typeof AqarApplication>) {
    const faculty = await Faculty.findById(application.facultyId).select(
        "userId departmentId designation"
    );

    if (!faculty?.userId) {
        throw new AuthError("Faculty account not found.", 404);
    }

    const user = await User.findById(faculty.userId).select(
        "name email role department designation universityName collegeName"
    );

    if (!user) {
        throw new AuthError("Faculty account not found.", 404);
    }

    const department = faculty.departmentId
        ? await Department.findById(faculty.departmentId).select("name")
        : null;

    return {
        ...user,
        department: department?.name ?? user.department,
        designation: faculty.designation || user.designation,
    };
}

export async function createAqarApplication(actor: SafeActor, rawInput: unknown) {
    const input = aqarApplicationSchema.parse(rawInput);
    await dbConnect();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can create AQAR applications.", 403);
    }

    const { faculty } = await ensureFacultyContext(actor.id);
    const metrics = computeAqarMetrics(input);

    const application = await AqarApplication.create({
        facultyId: faculty._id,
        academicYear: input.academicYear,
        reportingPeriod: input.reportingPeriod,
        facultyContribution: input.facultyContribution,
        metrics,
        reviewCommittee: [],
        statusLogs: [
            {
                status: "Draft",
                actorId: new Types.ObjectId(actor.id),
                actorName: actor.name,
                actorRole: actor.role,
                remarks: "AQAR contribution draft created.",
                changedAt: new Date(),
            },
        ],
        status: "Draft",
    });

    await syncEvidenceFromAqar(actor.id, input);

    return application;
}

export async function getFacultyAqarApplications(actor: SafeActor) {
    await dbConnect();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can view their AQAR applications.", 403);
    }

    const { faculty } = await ensureFacultyContext(actor.id);

    return AqarApplication.find({ facultyId: faculty._id }).sort({ updatedAt: -1 });
}

export async function getAqarApplicationById(actor: SafeActor, id: string) {
    await dbConnect();
    const application = await AqarApplication.findById(id);

    if (!application) {
        throw new AuthError("AQAR application not found.", 404);
    }

    if (actor.role === "Admin") {
        return application;
    }

    if (actor.role === "Faculty") {
        const { faculty } = await ensureFacultyContext(actor.id);
        if (application.facultyId.toString() === faculty._id.toString()) {
            return application;
        }
    }

    const headedDepartment = await getDepartmentHeadedByUser(actor.id);

    if (headedDepartment) {
        const faculty = await getUserForApplication(application);
        if (faculty.department === headedDepartment.name) {
            return application;
        }
    }

    throw new AuthError("You do not have access to this AQAR application.", 403);
}

export async function updateAqarApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = aqarApplicationSchema.parse(rawInput);
    const application = await getAqarApplicationById(actor, id);
    const facultyContext = actor.role === "Faculty" ? await ensureFacultyContext(actor.id) : null;

    if (
        actor.role !== "Faculty" ||
        application.facultyId.toString() !== facultyContext?.faculty._id.toString()
    ) {
        throw new AuthError("Only the faculty owner can update this AQAR application.", 403);
    }

    if (!["Draft", "Rejected"].includes(application.status)) {
        throw new AuthError("Only draft or rejected AQAR applications can be edited.", 409);
    }

    application.academicYear = input.academicYear;
    application.reportingPeriod = input.reportingPeriod;
    application.facultyContribution = input.facultyContribution;
    application.metrics = computeAqarMetrics(input);

    pushStatusLog(application, application.status, actor, "AQAR application draft auto-saved.");
    await application.save();
    await syncEvidenceFromAqar(actor.id, input);

    return application;
}

export async function submitAqarApplication(actor: SafeActor, id: string) {
    const application = await getAqarApplicationById(actor, id);
    const facultyContext = actor.role === "Faculty" ? await ensureFacultyContext(actor.id) : null;

    if (
        actor.role !== "Faculty" ||
        application.facultyId.toString() !== facultyContext?.faculty._id.toString()
    ) {
        throw new AuthError("Only the faculty owner can submit this AQAR application.", 403);
    }

    if (!["Draft", "Rejected"].includes(application.status)) {
        throw new AuthError("Only draft or rejected applications can be submitted.", 409);
    }

    if (application.metrics.totalContributionIndex <= 0) {
        throw new AuthError("AQAR application must contain contribution data before submission.", 400);
    }

    application.status = "Submitted";
    application.submittedAt = new Date();
    pushStatusLog(application, "Submitted", actor, "Faculty submitted AQAR application.");
    await application.save();

    return application;
}

export async function deleteAqarApplication(actor: SafeActor, id: string) {
    await dbConnect();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only the faculty owner can delete this AQAR application.", 403);
    }

    const { faculty } = await ensureFacultyContext(actor.id);

    const application = await AqarApplication.findOne({ _id: id, facultyId: faculty._id });

    if (!application) {
        throw new AuthError("AQAR application not found.", 404);
    }

    if (!["Draft", "Rejected"].includes(application.status)) {
        throw new AuthError("Only draft or rejected AQAR applications can be deleted.", 409);
    }

    await AqarApplication.deleteOne({ _id: application._id });

    return application;
}

export async function reviewAqarApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = aqarReviewSchema.parse(rawInput);
    const application = await getAqarApplicationById(actor, id);

    const faculty = await getUserForApplication(application);
    const headedDepartment = await getDepartmentHeadedByUser(actor.id);
    const isDepartmentHead =
        Boolean(headedDepartment) && faculty.department === headedDepartment?.name;
    const isCommitteeReviewer = actor.role === "Admin" || actor.role === "Director";

    if (!isDepartmentHead && !isCommitteeReviewer) {
        throw new AuthError("You are not authorized to review this AQAR application.", 403);
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
            stage: isDepartmentHead ? "Department Head" : "AQAR Committee",
            reviewedAt: new Date(),
        });
        pushStatusLog(application, "Rejected", actor, input.remarks);
        await application.save();

        return application;
    }

    const nextStatus: AqarStatus =
        application.status === "Submitted" ? "Under Review" : "Committee Review";

    application.status = nextStatus;
    application.reviewCommittee.push({
        reviewerId: new Types.ObjectId(actor.id),
        reviewerName: actor.name,
        reviewerRole: actor.role,
        designation:
            nextStatus === "Under Review"
                ? "Department Head Reviewer"
                : "AQAR Committee Reviewer",
        remarks: input.remarks,
        decision: input.decision,
        stage: nextStatus === "Under Review" ? "Department Head" : "AQAR Committee",
        reviewedAt: new Date(),
    });
    pushStatusLog(application, nextStatus, actor, input.remarks);
    await application.save();

    return application;
}

export async function approveAqarApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = aqarApprovalSchema.parse(rawInput);

    if (actor.role !== "Admin") {
        throw new AuthError("Only admin users can finalize AQAR approval.", 403);
    }

    const application = await getAqarApplicationById(actor, id);

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

export async function getAqarReviewQueue(actor: SafeActor) {
    await dbConnect();

    if (actor.role === "Admin") {
        return AqarApplication.find({
            status: { $in: ["Under Review", "Committee Review", "Submitted"] },
        }).sort({ updatedAt: -1 });
    }

    const headedDepartment = await getDepartmentHeadedByUser(actor.id);

    if (!headedDepartment) {
        return [];
    }

    const departments = await Department.find({ name: headedDepartment.name }).select("_id");
    const facultyUsers = await Faculty.find({
        departmentId: { $in: departments.map((item) => item._id) },
    }).select("_id");

    return AqarApplication.find({
        facultyId: { $in: facultyUsers.map((item) => item._id) },
        status: { $in: ["Submitted", "Under Review"] },
    }).sort({ updatedAt: -1 });
}
