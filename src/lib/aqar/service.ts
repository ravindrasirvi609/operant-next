import { Types } from "mongoose";

import { formatAcademicYearLabel, parseAcademicYearLabel } from "@/lib/academic-year";
import { createAuditLog, type AuditRequestContext } from "@/lib/audit/service";
import dbConnect from "@/lib/dbConnect";
import {
    buildAuthorizedScopeQuery,
    canUseBreakGlassOverride,
    canViewModuleRecord,
    resolveAuthorizationProfile,
} from "@/lib/authorization/service";
import { AuthError } from "@/lib/auth/errors";
import { ensureFacultyContext } from "@/lib/faculty/migration";
import {
    applyFacultyWorkflowScope,
    getFacultyUserInfo,
} from "@/lib/faculty/module-helpers";
import {
    buildStatusLogEntry,
    parseDeadlineDate,
    getReminderThreshold,
    type SafeActor,
} from "@/lib/workflow/shared";
import AqarApplication, { type AqarStatus } from "@/models/core/aqar-application";
import AcademicYear from "@/models/reference/academic-year";
import AqarCycle from "@/models/core/aqar-cycle";
import { aqarApplicationSchema, aqarApprovalSchema, aqarReviewSchema } from "@/lib/aqar/validators";
import { loadAqarImportContext, buildAqarImportPayload } from "@/lib/aqar/references";
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


function computeAqarMetrics(input: ReturnType<typeof aqarApplicationSchema.parse>) {
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

async function resolveAcademicYearFromInput(input: {
    academicYearId?: string;
    academicYear?: string;
}) {
    const normalizedId = input.academicYearId?.trim();

    if (normalizedId) {
        if (!Types.ObjectId.isValid(normalizedId)) {
            throw new AuthError("Invalid academic year id.", 400);
        }

        const byId = await AcademicYear.findById(normalizedId).select("_id yearStart yearEnd");
        if (!byId) {
            throw new AuthError("Academic year not found.", 404);
        }

        return {
            id: byId._id,
            label: formatAcademicYearLabel(byId.yearStart, byId.yearEnd),
        };
    }

    const normalizedLabel = input.academicYear?.trim();
    const parsed = parseAcademicYearLabel(normalizedLabel);

    if (!parsed) {
        throw new AuthError("Invalid academic year label.", 400);
    }

    const byLabel = await AcademicYear.findOne({
        yearStart: parsed.start,
        yearEnd: parsed.end,
    }).select("_id yearStart yearEnd");

    if (!byLabel) {
        throw new AuthError(
            `Academic year \"${normalizedLabel}\" is not configured. Add it in Admin > Academics first.`,
            400
        );
    }

    return {
        id: byLabel._id,
        label: formatAcademicYearLabel(byLabel.yearStart, byLabel.yearEnd),
    };
}

function pushStatusLog(
    application: InstanceType<typeof AqarApplication>,
    status: AqarStatus,
    actor?: SafeActor,
    remarks?: string
) {
    application.statusLogs.push(buildStatusLogEntry(status, actor, remarks));
}

async function notifyAqarStageAssignment(
    application: InstanceType<typeof AqarApplication>,
    stage: { key: string; label: string; approverRoles: string[] } | null,
    actor: SafeActor
) {
    if (!stage) {
        return;
    }

    const subjectScope = await applyFacultyWorkflowScope(application, application.facultyId);

    await notifyWorkflowStageAssignees({
        stage: {
            key: stage.key,
            label: stage.label,
            approverRoles: stage.approverRoles as Array<"DEPARTMENT_HEAD" | "DIRECTOR" | "OFFICE_HEAD" | "IQAC" | "AQAR_COMMITTEE" | "PRINCIPAL" | "FACULTY">,
        },
        subjectDepartmentName: subjectScope.departmentName,
        subjectCollegeName: subjectScope.collegeName,
        subjectUniversityName: subjectScope.universityName,
        moduleName: "AQAR",
        entityId: application._id.toString(),
        href: "/director/aqar",
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
    const facultyUser = await getFacultyUserInfo(application.facultyId);

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

/** Create a new AQAR contribution draft for the authenticated faculty. */
export async function createAqarApplication(actor: SafeActor, rawInput: unknown) {
    const input = aqarApplicationSchema.parse(rawInput);
    await dbConnect();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can create AQAR applications.", 403);
    }

    const { faculty } = await ensureFacultyContext(actor.id);
    const resolvedAcademicYear = await resolveAcademicYearFromInput(input);
    const metrics = computeAqarMetrics(input);

    const duplicate = await AqarApplication.findOne({
        facultyId: faculty._id,
        academicYear: resolvedAcademicYear.label,
    }).lean();
    if (duplicate) {
        throw new AuthError(
            `An AQAR application for academic year ${resolvedAcademicYear.label} already exists.`,
            409
        );
    }

    const application = await AqarApplication.create({
        facultyId: faculty._id,
        academicYearId: resolvedAcademicYear.id,
        academicYear: resolvedAcademicYear.label,
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

/** Return all AQAR applications owned by the authenticated faculty, newest first. */
export async function getFacultyAqarApplications(actor: SafeActor) {
    await dbConnect();

    if (actor.role !== "Faculty") {
        throw new AuthError("Only faculty users can view their AQAR applications.", 403);
    }

    const { faculty } = await ensureFacultyContext(actor.id);

    return AqarApplication.find({ facultyId: faculty._id }).sort({ updatedAt: -1 });
}

/** Fire a deadline reminder when the active AQAR cycle deadline is approaching and the faculty has no submitted application. */
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

    const deadline = parseDeadlineDate(cycle.reportingPeriod?.toDate);

    if (!deadline) {
        return;
    }

    const applications = await AqarApplication.find(
        cycle.academicYearId
            ? {
                  facultyId: faculty._id,
                  $or: [
                      { academicYearId: cycle.academicYearId },
                      { academicYear: cycle.academicYear },
                  ],
              }
            : {
                  facultyId: faculty._id,
                  academicYear: cycle.academicYear,
              }
    )
        .select("status")
        .sort({ updatedAt: -1 })
        .lean();

    const hasSubmittedApplication = applications.some(
        (application) => !["Draft", "Rejected"].includes(application.status)
    );

    if (hasSubmittedApplication) {
        return;
    }

    const threshold = getReminderThreshold(
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

/** Fetch a single AQAR application with role-based access control (Admin bypass, owner check, scoped view). */
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

    const subjectScope = await applyFacultyWorkflowScope(application, application.facultyId);
    const profile = await resolveAuthorizationProfile(actor);

    if (canViewModuleRecord(profile, "AQAR", subjectScope)) {
        return application;
    }

    throw new AuthError("You do not have access to this AQAR application.", 403);
}

/** Replace contribution data of a Draft or Rejected AQAR application; only the owner faculty may update. */
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
    const resolvedAcademicYear = await resolveAcademicYearFromInput(input);

    application.academicYearId = resolvedAcademicYear.id;
    application.academicYear = resolvedAcademicYear.label;
    application.reportingPeriod = input.reportingPeriod;
    application.facultyContribution = input.facultyContribution;
    application.metrics = computeAqarMetrics(input);

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

/** Transition a Draft or Rejected application to Submitted; triggers workflow sync and stage-assignment notification. */
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
    const subjectScope = await applyFacultyWorkflowScope(application, application.facultyId);

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
        subjectDepartmentName: subjectScope.departmentName,
        subjectCollegeName: subjectScope.collegeName,
        subjectUniversityName: subjectScope.universityName,
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

/** Permanently delete a Draft or Rejected AQAR application; only the owner faculty may delete. */
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

/** Forward, recommend, or reject a Submitted/Under-Review application; roles enforced by the workflow engine. */
export async function reviewAqarApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = aqarReviewSchema.parse(rawInput);
    const application = await getAqarApplicationById(actor, id);
    const workflowDefinition = await getActiveWorkflowDefinition("AQAR");
    const subjectScope = await applyFacultyWorkflowScope(application, application.facultyId);
    const isOverride = canUseBreakGlassOverride(actor, "AQAR") && Boolean(input.overrideReason?.trim());
    const canReview = await canActorProcessWorkflowStage({
        actor,
        moduleName: "AQAR",
        recordId: application._id.toString(),
        status: application.status,
        subjectDepartmentName: subjectScope.departmentName,
        subjectCollegeName: subjectScope.collegeName,
        subjectUniversityName: subjectScope.universityName,
        subjectDepartmentId: subjectScope.departmentId,
        subjectInstitutionId: subjectScope.institutionId,
        subjectDepartmentOrganizationId: subjectScope.departmentOrganizationId,
        subjectCollegeOrganizationId: subjectScope.collegeOrganizationId,
        subjectUniversityOrganizationId: subjectScope.universityOrganizationId,
        subjectOrganizationIds: subjectScope.subjectOrganizationIds,
        stageKinds: ["review"],
    });

    if (!canReview && !isOverride) {
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
            subjectDepartmentName: subjectScope.departmentName,
            subjectCollegeName: subjectScope.collegeName,
            subjectUniversityName: subjectScope.universityName,
            subjectDepartmentId: subjectScope.departmentId,
            subjectInstitutionId: subjectScope.institutionId,
            subjectDepartmentOrganizationId: subjectScope.departmentOrganizationId,
            subjectCollegeOrganizationId: subjectScope.collegeOrganizationId,
            subjectUniversityOrganizationId: subjectScope.universityOrganizationId,
            subjectOrganizationIds: subjectScope.subjectOrganizationIds,
            actor,
            remarks: input.remarks,
            action: "reject",
        });

        await createAuditLog({
            actor,
            action: isOverride ? "AQAR_REVIEW_REJECT_OVERRIDE" : "AQAR_REVIEW_REJECT",
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
        subjectDepartmentName: subjectScope.departmentName,
        subjectCollegeName: subjectScope.collegeName,
        subjectUniversityName: subjectScope.universityName,
        subjectDepartmentId: subjectScope.departmentId,
        subjectInstitutionId: subjectScope.institutionId,
        subjectDepartmentOrganizationId: subjectScope.departmentOrganizationId,
        subjectCollegeOrganizationId: subjectScope.collegeOrganizationId,
        subjectUniversityOrganizationId: subjectScope.universityOrganizationId,
        subjectOrganizationIds: subjectScope.subjectOrganizationIds,
        actor,
        remarks: input.remarks,
        action: "approve",
    });

    await createAuditLog({
        actor,
        action: isOverride ? "AQAR_REVIEW_OVERRIDE" : "AQAR_REVIEW",
        tableName: "aqar_applications",
        recordId: application._id.toString(),
        oldData: oldState,
        newData: application.toObject(),
        auditContext: actor.auditContext,
    });

    await notifyAqarStageAssignment(application, reviewTransition.stage, actor);

    return application;
}

/** Final approve or reject a Committee-Review application; restricted to Principal and Admin. */
export async function approveAqarApplication(actor: SafeActor, id: string, rawInput: unknown) {
    const input = aqarApprovalSchema.parse(rawInput);
    const workflowDefinition = await getActiveWorkflowDefinition("AQAR");

    const application = await getAqarApplicationById(actor, id);
    const subjectScope = await applyFacultyWorkflowScope(application, application.facultyId);
    const isOverride = canUseBreakGlassOverride(actor, "AQAR") && Boolean(input.overrideReason?.trim());
    const canFinalize = await canActorProcessWorkflowStage({
        actor,
        moduleName: "AQAR",
        recordId: application._id.toString(),
        status: application.status,
        subjectDepartmentName: subjectScope.departmentName,
        subjectCollegeName: subjectScope.collegeName,
        subjectUniversityName: subjectScope.universityName,
        subjectDepartmentId: subjectScope.departmentId,
        subjectInstitutionId: subjectScope.institutionId,
        subjectDepartmentOrganizationId: subjectScope.departmentOrganizationId,
        subjectCollegeOrganizationId: subjectScope.collegeOrganizationId,
        subjectUniversityOrganizationId: subjectScope.universityOrganizationId,
        subjectOrganizationIds: subjectScope.subjectOrganizationIds,
        stageKinds: ["final"],
    });
    const oldState = application.toObject();

    if (application.status !== "Committee Review") {
        throw new AuthError(
            `AQAR application cannot be finalized in status "${application.status}". Expected "Committee Review".`,
            409
        );
    }

    if (!canFinalize && !isOverride) {
        throw new AuthError("You are not authorized to finalize this AQAR application.", 403);
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
        designation: actor.role === "Admin" ? "Admin Final Approver" : "Principal Final Approver",
        remarks: input.remarks,
        decision: input.decision,
        stage: actor.role === "Admin" ? "Admin" : "Principal",
        reviewedAt: new Date(),
    });
    pushStatusLog(application, application.status, actor, input.remarks);
    await application.save();
    await syncWorkflowInstanceState({
        moduleName: "AQAR",
        recordId: application._id.toString(),
        status: application.status,
        subjectDepartmentName: subjectScope.departmentName,
        subjectCollegeName: subjectScope.collegeName,
        subjectUniversityName: subjectScope.universityName,
        subjectDepartmentId: subjectScope.departmentId,
        subjectInstitutionId: subjectScope.institutionId,
        subjectDepartmentOrganizationId: subjectScope.departmentOrganizationId,
        subjectCollegeOrganizationId: subjectScope.collegeOrganizationId,
        subjectUniversityOrganizationId: subjectScope.universityOrganizationId,
        subjectOrganizationIds: subjectScope.subjectOrganizationIds,
        actor,
        remarks: input.remarks,
        action: input.decision === "Approve" ? "approve" : "reject",
    });

    await createAuditLog({
        actor,
        action:
            input.decision === "Approve"
                ? isOverride
                    ? "AQAR_APPROVE_OVERRIDE"
                    : "AQAR_APPROVE"
                : isOverride
                  ? "AQAR_FINAL_REJECT_OVERRIDE"
                  : "AQAR_FINAL_REJECT",
        tableName: "aqar_applications",
        recordId: application._id.toString(),
        oldData: oldState,
        newData: application.toObject(),
        auditContext: actor.auditContext,
    });

    await notifyAqarFacultyOutcome(application, actor, input.decision);

    return application;
}

/** Return faculty workspace records pre-mapped to AQAR contribution shape for pre-filling the contribution form. */
export async function getAqarImportCandidates(actor: SafeActor, id: string) {
    const application = await getAqarApplicationById(actor, id);
    const facultyContext = actor.role === "Faculty" ? await ensureFacultyContext(actor.id) : null;

    if (
        actor.role !== "Faculty" ||
        application.facultyId.toString() !== facultyContext?.faculty._id.toString()
    ) {
        throw new AuthError(
            "Only the faculty owner can access import candidates for this AQAR application.",
            403
        );
    }

    const facultyUserInfo = await getFacultyUserInfo(application.facultyId);
    const resolvedYear = await resolveAcademicYearFromInput({
        academicYearId: application.academicYearId?.toString(),
        academicYear: application.academicYear,
    });

    const context = await loadAqarImportContext(application.facultyId, resolvedYear.id);
    return buildAqarImportPayload(context, facultyUserInfo.name ?? "", application.academicYear);
}

/** Return pending AQAR applications visible to the actor in their workflow review queue. */
export async function getAqarReviewQueue(
    actor: SafeActor,
    options?: { stageKinds?: Array<"review" | "final"> }
) {
    await dbConnect();
    const workflowDefinition = await getActiveWorkflowDefinition("AQAR");
    const applications = await AqarApplication.find({
        status: { $in: getWorkflowPendingStatuses(workflowDefinition) },
    }).sort({ updatedAt: -1 });

    await Promise.all(
        applications.map(async (application) => {
            const subjectScope = await applyFacultyWorkflowScope(application, application.facultyId);
            await syncWorkflowInstanceState({
                moduleName: "AQAR",
                recordId: application._id.toString(),
                status: application.status,
                subjectDepartmentName: subjectScope.departmentName,
                subjectCollegeName: subjectScope.collegeName,
                subjectUniversityName: subjectScope.universityName,
                subjectDepartmentId: subjectScope.departmentId,
                subjectInstitutionId: subjectScope.institutionId,
                subjectDepartmentOrganizationId: subjectScope.departmentOrganizationId,
                subjectCollegeOrganizationId: subjectScope.collegeOrganizationId,
                subjectUniversityOrganizationId: subjectScope.universityOrganizationId,
                subjectOrganizationIds: subjectScope.subjectOrganizationIds,
            });
        })
    );

    const recordIds = await listPendingWorkflowRecordIds({
        actor,
        moduleName: "AQAR",
        stageKinds: options?.stageKinds,
    });
    const recordIdSet = new Set(recordIds);

    return applications.filter((application) => recordIdSet.has(application._id.toString()));
}

/** Return all AQAR applications within the actor's organizational scope, annotated with per-record review/approve permissions. */
export async function getAqarScopedApplications(actor: SafeActor) {
    await dbConnect();
    const profile = await resolveAuthorizationProfile(actor);

    if (!profile.hasLeadershipPortalAccess) {
        return [];
    }

    const applications = await AqarApplication.find(buildAuthorizedScopeQuery(profile)).sort({ updatedAt: -1 });

    await Promise.all(
        applications.map(async (application) => {
            const subjectScope = await applyFacultyWorkflowScope(application, application.facultyId);
            await syncWorkflowInstanceState({
                moduleName: "AQAR",
                recordId: application._id.toString(),
                status: application.status,
                subjectDepartmentName: subjectScope.departmentName,
                subjectCollegeName: subjectScope.collegeName,
                subjectUniversityName: subjectScope.universityName,
                subjectDepartmentId: subjectScope.departmentId,
                subjectInstitutionId: subjectScope.institutionId,
                subjectDepartmentOrganizationId: subjectScope.departmentOrganizationId,
                subjectCollegeOrganizationId: subjectScope.collegeOrganizationId,
                subjectUniversityOrganizationId: subjectScope.universityOrganizationId,
                subjectOrganizationIds: subjectScope.subjectOrganizationIds,
            });
        })
    );

    const [reviewIds, finalIds] = await Promise.all([
        listPendingWorkflowRecordIds({
            actor,
            moduleName: "AQAR",
            stageKinds: ["review"],
        }),
        listPendingWorkflowRecordIds({
            actor,
            moduleName: "AQAR",
            stageKinds: ["final"],
        }),
    ]);

    const reviewIdSet = new Set(reviewIds);
    const finalIdSet = new Set(finalIds);

    return applications.map((application) => ({
        ...JSON.parse(JSON.stringify(application)),
        permissions: {
            canReview: reviewIdSet.has(application._id.toString()),
            canApprove: finalIdSet.has(application._id.toString()),
            canReject: reviewIdSet.has(application._id.toString()) || finalIdSet.has(application._id.toString()),
            canOverride: profile.isAdmin,
        },
    }));
}
