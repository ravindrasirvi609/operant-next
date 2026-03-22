import { Types } from "mongoose";

import { createAuditLog, type AuditRequestContext } from "@/lib/audit/service";
import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import { ensureFacultyContext } from "@/lib/faculty/migration";
import Organization from "@/models/core/organization";
import Department from "@/models/reference/department";
import Faculty from "@/models/faculty/faculty";
import User from "@/models/core/user";
import AqarApplication, { type AqarStatus } from "@/models/core/aqar-application";
import AqarCycle from "@/models/core/aqar-cycle";
import { aqarApplicationSchema, aqarApprovalSchema, aqarReviewSchema } from "@/lib/aqar/validators";
import WorkflowInstance from "@/models/core/workflow-instance";
import {
    canActorProcessWorkflowStage,
    getActiveWorkflowDefinition,
    getWorkflowPendingStatuses,
    getWorkflowStageByStatus,
    listPendingWorkflowRecordIds,
    resolveWorkflowTransition,
    syncWorkflowInstanceState,
} from "@/lib/workflow/engine";
import {
    notifyUser,
    notifyWorkflowStageAssignees,
} from "@/lib/notifications/service";

type SafeActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
    auditContext?: AuditRequestContext;
};

function parseAqarReminderDate(value?: string | null) {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = dateOnlyMatch
        ? new Date(`${trimmed}T23:59:59.999Z`)
        : new Date(trimmed);

    return Number.isNaN(date.getTime()) ? null : date;
}

function getAqarReminderThreshold(daysRemaining: number) {
    if (daysRemaining < 0) {
        return "overdue" as const;
    }

    if (daysRemaining <= 1) {
        return 1 as const;
    }

    if (daysRemaining <= 3) {
        return 3 as const;
    }

    if (daysRemaining <= 7) {
        return 7 as const;
    }

    if (daysRemaining <= 14) {
        return 14 as const;
    }

    return null;
}

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

async function getAqarWorkflowDepartmentName(application: InstanceType<typeof AqarApplication>) {
    const faculty = await getUserForApplication(application);
    return faculty.department;
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

async function notifyAqarStageAssignment(
    application: InstanceType<typeof AqarApplication>,
    stage: { key: string; label: string; approverRoles: string[] } | null,
    actor: SafeActor
) {
    if (!stage) {
        return;
    }

    await notifyWorkflowStageAssignees({
        stage: {
            key: stage.key,
            label: stage.label,
            approverRoles: stage.approverRoles as Array<"DEPARTMENT_HEAD" | "DIRECTOR" | "IQAC" | "PRINCIPAL" | "ADMIN" | "FACULTY">,
        },
        subjectDepartmentName: await getAqarWorkflowDepartmentName(application),
        moduleName: "AQAR",
        entityId: application._id.toString(),
        href: stage.key === "final_approval" ? "/admin/aqar" : "/director/aqar",
        title: `AQAR moved to ${stage.label}`,
        message: `${actor.name} moved AQAR contribution ${application.academicYear} to ${stage.label}.`,
        actor,
    });
}

async function notifyAqarFacultyOutcome(
    application: InstanceType<typeof AqarApplication>,
    actor: SafeActor,
    decision: "Approve" | "Reject"
) {
    const facultyUser = await getUserForApplication(application);

    await notifyUser({
        userId: facultyUser._id?.toString(),
        moduleName: "AQAR",
        entityId: application._id.toString(),
        href: "/faculty/aqar",
        title: decision === "Approve" ? "AQAR approved" : "AQAR returned for changes",
        message:
            decision === "Approve"
                ? `Your AQAR contribution for ${application.academicYear} was approved by ${actor.name}.`
                : `Your AQAR contribution for ${application.academicYear} was returned by ${actor.name}. Review remarks and resubmit.`,
        actor,
    });
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

    await createAuditLog({
        actor,
        action: "AQAR_CREATE",
        tableName: "aqar_applications",
        recordId: application._id.toString(),
        newData: {
            academicYear: application.academicYear,
            reportingPeriod: application.reportingPeriod,
            status: application.status,
            metrics: application.metrics,
        },
        auditContext: actor.auditContext,
    });

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

export async function ensureAqarReminderForFaculty(
    actor: Pick<SafeActor, "id" | "name" | "role" | "department">
) {
    if (actor.role !== "Faculty") {
        return;
    }

    await dbConnect();

    const { faculty } = await ensureFacultyContext(actor.id);
    const cycle = await AqarCycle.findOne({
        status: { $in: ["Draft", "Department Review", "IQAC Review", "Finalized"] },
    })
        .sort({ academicYear: -1, updatedAt: -1 })
        .lean();

    if (!cycle) {
        return;
    }

    const deadline = parseAqarReminderDate(cycle.reportingPeriod?.toDate);

    if (!deadline) {
        return;
    }

    const applications = await AqarApplication.find({
        facultyId: faculty._id,
        academicYear: cycle.academicYear,
    })
        .select("status")
        .sort({ updatedAt: -1 })
        .lean();

    const hasSubmittedApplication = applications.some(
        (application) => !["Draft", "Rejected"].includes(application.status)
    );

    if (hasSubmittedApplication) {
        return;
    }

    const threshold = getAqarReminderThreshold(
        Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    if (!threshold) {
        return;
    }

    const hasDraftInProgress = applications.some((application) =>
        ["Draft", "Rejected"].includes(application.status)
    );
    const deadlineLabel = cycle.reportingPeriod.toDate;
    const title =
        threshold === "overdue"
            ? "AQAR contribution deadline missed"
            : `AQAR reminder: ${threshold} day${threshold === 1 ? "" : "s"} left`;
    const message =
        threshold === "overdue"
            ? hasDraftInProgress
                ? `Your AQAR contribution draft for ${cycle.academicYear} is still pending submission and the ${deadlineLabel} deadline has passed.`
                : `No AQAR contribution has been submitted for ${cycle.academicYear}, and the ${deadlineLabel} deadline has passed.`
            : hasDraftInProgress
              ? `Your AQAR contribution draft for ${cycle.academicYear} is still open. Submit it before ${deadlineLabel}.`
              : `Create and submit your AQAR contribution for ${cycle.academicYear} before ${deadlineLabel}.`;

    await notifyUser({
        userId: actor.id,
        kind: "reminder",
        moduleName: "AQAR",
        entityId: cycle._id.toString(),
        href: "/faculty/aqar",
        title,
        message,
        metadata: {
            reminderType: "aqar_cycle",
            academicYear: cycle.academicYear,
            deadline: deadline.toISOString(),
            threshold,
            dedupeKey: `aqar-cycle:${cycle._id.toString()}:${threshold}`,
            dedupeWindowHours: 24 * 90,
        },
    });
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

    const oldState = application.toObject();

    application.academicYear = input.academicYear;
    application.reportingPeriod = input.reportingPeriod;
    application.facultyContribution = input.facultyContribution;
    application.metrics = computeAqarMetrics(input);

    pushStatusLog(application, application.status, actor, "AQAR application draft auto-saved.");
    await application.save();

    await createAuditLog({
        actor,
        action: "AQAR_UPDATE",
        tableName: "aqar_applications",
        recordId: application._id.toString(),
        oldData: oldState,
        newData: application.toObject(),
        auditContext: actor.auditContext,
    });

    return application;
}

export async function submitAqarApplication(actor: SafeActor, id: string) {
    const application = await getAqarApplicationById(actor, id);
    const facultyContext = actor.role === "Faculty" ? await ensureFacultyContext(actor.id) : null;
    const workflowDefinition = await getActiveWorkflowDefinition("AQAR");

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

    const oldState = application.toObject();

    application.status = resolveWorkflowTransition(
        workflowDefinition,
        application.status,
        "submit"
    ).status as AqarStatus;
    application.submittedAt = new Date();
    pushStatusLog(application, application.status, actor, "Faculty submitted AQAR application.");
    await application.save();
    await syncWorkflowInstanceState({
        moduleName: "AQAR",
        recordId: application._id.toString(),
        status: application.status,
        subjectDepartmentName: await getAqarWorkflowDepartmentName(application),
        actor,
        remarks: "AQAR submitted.",
        action: "submit",
    });

    await createAuditLog({
        actor,
        action: "AQAR_SUBMIT",
        tableName: "aqar_applications",
        recordId: application._id.toString(),
        oldData: oldState,
        newData: application.toObject(),
        auditContext: actor.auditContext,
    });

    await notifyAqarStageAssignment(application, getWorkflowStageByStatus(workflowDefinition, application.status), actor);

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

    const deletedState = application.toObject();

    await AqarApplication.deleteOne({ _id: application._id });
    await WorkflowInstance.deleteOne({ moduleName: "AQAR", recordId: application._id.toString() });

    await createAuditLog({
        actor,
        action: "AQAR_DELETE",
        tableName: "aqar_applications",
        recordId: application._id.toString(),
        oldData: deletedState,
        auditContext: actor.auditContext,
    });

    return application;
}

export async function reviewAqarApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = aqarReviewSchema.parse(rawInput);
    const application = await getAqarApplicationById(actor, id);
    const workflowDefinition = await getActiveWorkflowDefinition("AQAR");
    const canReview = await canActorProcessWorkflowStage({
        actor,
        moduleName: "AQAR",
        recordId: application._id.toString(),
        status: application.status,
        subjectDepartmentName: await getAqarWorkflowDepartmentName(application),
        stageKinds: ["review"],
    });

    if (!canReview) {
        throw new AuthError("You are not authorized to review this AQAR application.", 403);
    }

    const oldState = application.toObject();
    const currentStage = getWorkflowStageByStatus(workflowDefinition, application.status);

    if (!currentStage || currentStage.kind !== "review") {
        throw new AuthError("Only submitted or under-review AQAR applications can be reviewed.", 409);
    }

    const reviewTransition = resolveWorkflowTransition(
        workflowDefinition,
        application.status,
        input.decision === "Reject" ? "reject" : "approve"
    );

    if (input.decision === "Reject") {
        application.status = reviewTransition.status as AqarStatus;
        application.reviewCommittee.push({
            reviewerId: new Types.ObjectId(actor.id),
            reviewerName: actor.name,
            reviewerRole: actor.role,
            designation:
                currentStage.key === "department_head_review"
                    ? "Department Head"
                    : "AQAR Committee Reviewer",
            remarks: input.remarks,
            decision: input.decision,
            stage:
                currentStage.key === "department_head_review"
                    ? "Department Head"
                    : "AQAR Committee",
            reviewedAt: new Date(),
        });
        pushStatusLog(application, "Rejected", actor, input.remarks);
        await application.save();
        await syncWorkflowInstanceState({
            moduleName: "AQAR",
            recordId: application._id.toString(),
            status: application.status,
            subjectDepartmentName: await getAqarWorkflowDepartmentName(application),
            actor,
            remarks: input.remarks,
            action: "reject",
        });

        await createAuditLog({
            actor,
            action: "AQAR_REVIEW_REJECT",
            tableName: "aqar_applications",
            recordId: application._id.toString(),
            oldData: oldState,
            newData: application.toObject(),
            auditContext: actor.auditContext,
        });

        await notifyAqarFacultyOutcome(application, actor, "Reject");

        return application;
    }

    const nextStatus = reviewTransition.status as AqarStatus;

    application.status = nextStatus;
    application.reviewCommittee.push({
        reviewerId: new Types.ObjectId(actor.id),
        reviewerName: actor.name,
        reviewerRole: actor.role,
        designation:
            currentStage.key === "department_head_review"
                ? "Department Head Reviewer"
                : "AQAR Committee Reviewer",
        remarks: input.remarks,
        decision: input.decision,
        stage:
            currentStage.key === "department_head_review"
                ? "Department Head"
                : "AQAR Committee",
        reviewedAt: new Date(),
    });
    pushStatusLog(application, nextStatus, actor, input.remarks);
    await application.save();
    await syncWorkflowInstanceState({
        moduleName: "AQAR",
        recordId: application._id.toString(),
        status: application.status,
        subjectDepartmentName: await getAqarWorkflowDepartmentName(application),
        actor,
        remarks: input.remarks,
        action: "approve",
    });

    await createAuditLog({
        actor,
        action: "AQAR_REVIEW",
        tableName: "aqar_applications",
        recordId: application._id.toString(),
        oldData: oldState,
        newData: application.toObject(),
        auditContext: actor.auditContext,
    });

    await notifyAqarStageAssignment(application, reviewTransition.stage, actor);

    return application;
}

export async function approveAqarApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = aqarApprovalSchema.parse(rawInput);
    const workflowDefinition = await getActiveWorkflowDefinition("AQAR");

    if (actor.role !== "Admin") {
        throw new AuthError("Only admin users can finalize AQAR approval.", 403);
    }

    const application = await getAqarApplicationById(actor, id);
    const canFinalize = await canActorProcessWorkflowStage({
        actor,
        moduleName: "AQAR",
        recordId: application._id.toString(),
        status: application.status,
        subjectDepartmentName: await getAqarWorkflowDepartmentName(application),
        stageKinds: ["final"],
    });
    const oldState = application.toObject();

    if (!canFinalize) {
        throw new AuthError("Only final-stage AQAR applications can be finalized.", 409);
    }

    application.status = resolveWorkflowTransition(
        workflowDefinition,
        application.status,
        input.decision === "Approve" ? "approve" : "reject"
    ).status as AqarStatus;
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
    await syncWorkflowInstanceState({
        moduleName: "AQAR",
        recordId: application._id.toString(),
        status: application.status,
        subjectDepartmentName: await getAqarWorkflowDepartmentName(application),
        actor,
        remarks: input.remarks,
        action: input.decision === "Approve" ? "approve" : "reject",
    });

    await createAuditLog({
        actor,
        action: input.decision === "Approve" ? "AQAR_APPROVE" : "AQAR_FINAL_REJECT",
        tableName: "aqar_applications",
        recordId: application._id.toString(),
        oldData: oldState,
        newData: application.toObject(),
        auditContext: actor.auditContext,
    });

    await notifyAqarFacultyOutcome(application, actor, input.decision);

    return application;
}

export async function getAqarReviewQueue(actor: SafeActor) {
    await dbConnect();
    const workflowDefinition = await getActiveWorkflowDefinition("AQAR");
    const applications = await AqarApplication.find({
        status: { $in: getWorkflowPendingStatuses(workflowDefinition) },
    }).sort({ updatedAt: -1 });

    await Promise.all(
        applications.map(async (application) => {
            await syncWorkflowInstanceState({
                moduleName: "AQAR",
                recordId: application._id.toString(),
                status: application.status,
                subjectDepartmentName: await getAqarWorkflowDepartmentName(application),
            });
        })
    );

    const recordIds = await listPendingWorkflowRecordIds({
        actor,
        moduleName: "AQAR",
        stageKinds: actor.role === "Admin" ? ["final"] : ["review"],
    });
    const recordIdSet = new Set(recordIds);

    return applications.filter((application) => recordIdSet.has(application._id.toString()));
}
