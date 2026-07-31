import dbConnect from "@/lib/dbConnect";
import { ensureFacultyContext } from "@/lib/faculty/migration";
import { applyFacultyWorkflowScope, getFacultyUserInfo } from "@/lib/faculty/module-helpers";
import { getReminderThreshold, type SafeActor } from "@/lib/workflow/shared";
import { notifyUser, notifyWorkflowStageAssignees } from "@/lib/notifications/service";
import { ensurePbasDynamicMigration } from "@/lib/pbas/migration";
import { getPbasSubmissionDeadline } from "@/lib/pbas/admin";
import AcademicYear from "@/models/reference/academic-year";
import FacultyPbasForm from "@/models/core/faculty-pbas-form";

export async function ensurePbasDeadlineReminderForFaculty(actor: Pick<SafeActor, "id" | "name" | "role">) {
    if (actor.role !== "Faculty") {
        return;
    }

    await dbConnect();
    await ensurePbasDynamicMigration();

    const [{ faculty }, { parsedDeadline, rawDeadline }] = await Promise.all([
        ensureFacultyContext(actor.id),
        getPbasSubmissionDeadline(),
    ]);
    const activeYear =
        (await AcademicYear.findOne({ isActive: true }).sort({ yearStart: -1 })) ||
        (await AcademicYear.findOne({}).sort({ yearStart: -1 }));

    if (!parsedDeadline || !rawDeadline.trim() || !activeYear) {
        return;
    }

    const applications = await FacultyPbasForm.find({
        facultyId: faculty._id,
        academicYearId: activeYear._id,
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

    const threshold = getReminderThreshold(
        Math.ceil((parsedDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    if (!threshold) {
        return;
    }

    const hasDraftInProgress = applications.some((application) =>
        ["Draft", "Rejected"].includes(application.status)
    );
    const deadlineLabel = rawDeadline.trim();
    const entityId = `deadline:${parsedDeadline.toISOString().slice(0, 10)}`;
    const title =
        threshold === "overdue"
            ? "PBAS submission deadline missed"
            : `PBAS submission reminder: ${threshold} day${threshold === 1 ? "" : "s"} left`;
    const message =
        threshold === "overdue"
            ? hasDraftInProgress
                ? `Your PBAS appraisal draft is still pending submission and the ${deadlineLabel} deadline has passed. Contact admin if the submission window needs reopening.`
                : `No PBAS appraisal has been submitted and the ${deadlineLabel} deadline has passed. Contact admin if the reporting window needs reopening.`
            : hasDraftInProgress
              ? `Your PBAS appraisal is still in draft state. Submit it before ${deadlineLabel} to avoid missing the reporting window.`
              : `Create and submit your PBAS appraisal before ${deadlineLabel} so it reaches the review queue on time.`;

    await notifyUser({
        userId: actor.id,
        kind: "reminder",
        moduleName: "PBAS",
        entityId,
        href: "/faculty/pbas",
        title,
        message,
        metadata: {
            reminderType: "submission_deadline",
            deadline: parsedDeadline.toISOString(),
            threshold,
            dedupeKey: `pbas-deadline:${entityId}:${threshold}`,
            dedupeWindowHours: 24 * 90,
        },
    });
}

export async function notifyPbasStageAssignment(
    application: InstanceType<typeof FacultyPbasForm>,
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
            approverRoles: stage.approverRoles as Array<"DEPARTMENT_HEAD" | "DIRECTOR" | "IQAC" | "PBAS_COMMITTEE" | "PRINCIPAL" | "ADMIN" | "FACULTY">,
        },
        subjectDepartmentName: subjectScope.departmentName,
        subjectCollegeName: subjectScope.collegeName,
        subjectUniversityName: subjectScope.universityName,
        moduleName: "PBAS",
        entityId: application._id.toString(),
        href: stage.key === "final_approval" ? "/director/pbas" : "/director/pbas",
        title: `PBAS moved to ${stage.label}`,
        message: `${actor.name} submitted PBAS appraisal ${application.academicYear} for ${stage.label}.`,
        actor,
    });
}

export async function notifyPbasFacultyOutcome(
    application: InstanceType<typeof FacultyPbasForm>,
    actor: SafeActor,
    decision: "Approve" | "Reject"
) {
    const facultyUser = await getFacultyUserInfo(application.facultyId);

    await notifyUser({
        userId: facultyUser._id?.toString(),
        moduleName: "PBAS",
        entityId: application._id.toString(),
        href: "/faculty/pbas",
        title: decision === "Approve" ? "PBAS approved" : "PBAS returned for changes",
        message:
            decision === "Approve"
                ? `Your PBAS appraisal for ${application.academicYear} was approved by ${actor.name}.`
                : `Your PBAS appraisal for ${application.academicYear} was returned by ${actor.name}. Review remarks and resubmit.`,
        actor,
    });
}
