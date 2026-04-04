import { Types } from "mongoose";

import { formatAcademicYearLabel } from "@/lib/academic-year";
import { createAuditLog, type AuditRequestContext } from "@/lib/audit/service";
import { AuthError } from "@/lib/auth/errors";
import {
    buildAuthorizedScopeQuery,
    canListModuleRecords,
    canViewModuleRecord,
    resolveAuthorizationProfile,
    resolveFacultyAuthorizationScope,
} from "@/lib/authorization/service";
import dbConnect from "@/lib/dbConnect";
import {
    canActorProcessWorkflowStage,
    getActiveWorkflowDefinition,
    getWorkflowStageByStatus,
    resolveWorkflowTransition,
    syncWorkflowInstanceState,
} from "@/lib/workflow/engine";
import Course from "@/models/academic/course";
import TeachingLearningAssessment from "@/models/academic/teaching-learning-assessment";
import TeachingLearningAssignment, {
    type ITeachingLearningAssignment,
    type TeachingLearningWorkflowStatus,
} from "@/models/academic/teaching-learning-assignment";
import TeachingLearningPlan from "@/models/academic/teaching-learning-plan";
import TeachingLearningSession from "@/models/academic/teaching-learning-session";
import TeachingLearningSupport from "@/models/academic/teaching-learning-support";
import Program from "@/models/academic/program";
import User from "@/models/core/user";
import FacultyTeachingLoad from "@/models/faculty/faculty-teaching-load";
import FacultyTeachingSummary from "@/models/faculty/faculty-teaching-summary";
import AcademicYear from "@/models/reference/academic-year";
import Department from "@/models/reference/department";
import DocumentModel from "@/models/reference/document";
import Institution from "@/models/reference/institution";
import Semester from "@/models/reference/semester";
import {
    teachingLearningAssignmentSchema,
    teachingLearningAssignmentUpdateSchema,
    teachingLearningContributionDraftSchema,
    teachingLearningPlanSchema,
    teachingLearningPlanUpdateSchema,
    teachingLearningReviewSchema,
    type TeachingLearningContributionDraftInput,
} from "@/lib/teaching-learning/validators";

type TeachingLearningActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
    collegeName?: string;
    universityName?: string;
    auditContext?: AuditRequestContext;
};

type TeachingLearningScope = {
    departmentName?: string;
    collegeName?: string;
    universityName?: string;
    departmentId?: string;
    institutionId?: string;
    departmentOrganizationId?: string;
    collegeOrganizationId?: string;
    universityOrganizationId?: string;
    subjectOrganizationIds?: string[];
};

type HydratedDocumentRecord = {
    id: string;
    fileName?: string;
    fileUrl?: string;
    fileType?: string;
    uploadedAt?: Date;
    verificationStatus?: string;
    verificationRemarks?: string;
};

type HydratedAssignmentRecord = {
    _id: string;
    planId: string;
    planTitle: string;
    academicYearLabel: string;
    programName: string;
    courseTitle: string;
    courseCode?: string;
    semesterNumber?: number;
    sectionName?: string;
    deliveryType: string;
    plannedSessions: number;
    plannedContactHours: number;
    classStrength?: number;
    planSummary?: string;
    planStatus: string;
    sourceTeachingLoadId?: string;
    teachingLoadSnapshot?: {
        subjectCode?: string;
        lectureHours: number;
        tutorialHours: number;
        practicalHours: number;
        totalHours: number;
        innovativePedagogy?: string;
    } | null;
    teachingSummarySnapshot?: {
        classesTaken: number;
        coursePreparationHours: number;
        coursesTaught: string[];
        mentoringCount: number;
        labSupervisionCount: number;
        feedbackSummary?: string;
    } | null;
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: TeachingLearningWorkflowStatus;
    dueDate?: Date;
    notes?: string;
    pedagogicalApproach?: string;
    learnerCentricPractices?: string;
    digitalResources?: string;
    attendanceStrategy?: string;
    feedbackAnalysis?: string;
    attainmentSummary?: string;
    actionTaken?: string;
    innovationHighlights?: string;
    supportingLinks: string[];
    lessonPlanDocumentId?: string;
    questionPaperDocumentId?: string;
    resultAnalysisDocumentId?: string;
    lessonPlanDocument?: HydratedDocumentRecord;
    questionPaperDocument?: HydratedDocumentRecord;
    resultAnalysisDocument?: HydratedDocumentRecord;
    documentIds: string[];
    documents: HydratedDocumentRecord[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    sessions: Array<{
        id: string;
        sessionNumber: number;
        moduleTitle?: string;
        topic: string;
        plannedDate?: Date;
        deliveredDate?: Date;
        teachingMethod: string;
        ictTool?: string;
        attendancePercent?: number;
        learningOutcome?: string;
        reflectionNotes?: string;
        isDelivered: boolean;
        documentId?: string;
        document?: {
            id: string;
            fileName?: string;
            fileUrl?: string;
            verificationStatus?: string;
        };
    }>;
    assessments: Array<{
        id: string;
        title: string;
        assessmentType: string;
        weightage: number;
        scheduledDate?: Date;
        evaluatedDate?: Date;
        coMappingCodes: string[];
        maxMarks?: number;
        averageMarks?: number;
        attainmentPercentage?: number;
        remarks?: string;
        isCompleted: boolean;
        documentId?: string;
        document?: {
            id: string;
            fileName?: string;
            fileUrl?: string;
            verificationStatus?: string;
        };
    }>;
    supports: Array<{
        id: string;
        title: string;
        supportType: string;
        targetGroup?: string;
        interventionDate?: Date;
        participantCount?: number;
        outcomeSummary?: string;
        followUpAction?: string;
        documentId?: string;
        document?: {
            id: string;
            fileName?: string;
            fileUrl?: string;
            verificationStatus?: string;
        };
    }>;
    reviewHistory: Array<{
        reviewerName?: string;
        reviewerRole?: string;
        stage: string;
        decision: string;
        remarks?: string;
        reviewedAt?: Date;
    }>;
    statusLogs: Array<{
        status: string;
        actorName?: string;
        actorRole?: string;
        remarks?: string;
        changedAt?: Date;
    }>;
    valueSummary: string;
    submittedAt?: Date;
    reviewedAt?: Date;
    approvedAt?: Date;
    updatedAt?: Date;
    scopeDepartmentName?: string;
    scopeCollegeName?: string;
    scopeUniversityName?: string;
    currentStageLabel: string;
    currentStageKind: string | null;
    availableDecisions: string[];
    permissions: {
        canView: boolean;
        canReview: boolean;
        canApprove: boolean;
        canReject: boolean;
    };
};

function ensureObjectId(id: string, message: string) {
    if (!Types.ObjectId.isValid(id)) {
        throw new AuthError(message, 400);
    }

    return new Types.ObjectId(id);
}

function toOptionalDate(value?: string | null) {
    if (!value?.trim()) {
        return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new AuthError(`Invalid date "${value}".`, 400);
    }

    return parsed;
}

function toOptionalObjectId(value?: string | null) {
    if (!value?.trim()) {
        return undefined;
    }

    return ensureObjectId(value, "Invalid identifier.");
}

function toObjectIdList(values?: string[]) {
    return (values ?? [])
        .filter((value) => Types.ObjectId.isValid(value))
        .map((value) => new Types.ObjectId(value));
}

function uniqueStrings(values: Array<string | undefined | null>) {
    return Array.from(
        new Set(
            values
                .map((value) => String(value ?? "").trim())
                .filter(Boolean)
        )
    );
}

function ensureAdminActor(actor: TeachingLearningActor) {
    if (actor.role !== "Admin") {
        throw new AuthError("Admin access is required.", 403);
    }
}

function pushStatusLog(
    assignment: InstanceType<typeof TeachingLearningAssignment>,
    status: TeachingLearningWorkflowStatus,
    actor?: TeachingLearningActor,
    remarks?: string
) {
    assignment.statusLogs.push({
        status,
        actorId: actor?.id ? new Types.ObjectId(actor.id) : undefined,
        actorName: actor?.name,
        actorRole: actor?.role,
        remarks,
        changedAt: new Date(),
    });
}

function copyScopeToPlan(
    plan: InstanceType<typeof TeachingLearningPlan>,
    scope: TeachingLearningScope
) {
    plan.scopeDepartmentName = scope.departmentName;
    plan.scopeCollegeName = scope.collegeName;
    plan.scopeUniversityName = scope.universityName;
    plan.scopeDepartmentId =
        scope.departmentId && Types.ObjectId.isValid(scope.departmentId)
            ? new Types.ObjectId(scope.departmentId)
            : undefined;
    plan.scopeInstitutionId =
        scope.institutionId && Types.ObjectId.isValid(scope.institutionId)
            ? new Types.ObjectId(scope.institutionId)
            : undefined;
    plan.scopeDepartmentOrganizationId =
        scope.departmentOrganizationId && Types.ObjectId.isValid(scope.departmentOrganizationId)
            ? new Types.ObjectId(scope.departmentOrganizationId)
            : undefined;
    plan.scopeCollegeOrganizationId =
        scope.collegeOrganizationId && Types.ObjectId.isValid(scope.collegeOrganizationId)
            ? new Types.ObjectId(scope.collegeOrganizationId)
            : undefined;
    plan.scopeUniversityOrganizationId =
        scope.universityOrganizationId && Types.ObjectId.isValid(scope.universityOrganizationId)
            ? new Types.ObjectId(scope.universityOrganizationId)
            : undefined;
    plan.scopeOrganizationIds = toObjectIdList(scope.subjectOrganizationIds);
}

function copyScopeToAssignment(
    assignment: InstanceType<typeof TeachingLearningAssignment>,
    scope: TeachingLearningScope
) {
    assignment.scopeDepartmentName = scope.departmentName;
    assignment.scopeCollegeName = scope.collegeName;
    assignment.scopeUniversityName = scope.universityName;
    assignment.scopeDepartmentId =
        scope.departmentId && Types.ObjectId.isValid(scope.departmentId)
            ? new Types.ObjectId(scope.departmentId)
            : undefined;
    assignment.scopeInstitutionId =
        scope.institutionId && Types.ObjectId.isValid(scope.institutionId)
            ? new Types.ObjectId(scope.institutionId)
            : undefined;
    assignment.scopeDepartmentOrganizationId =
        scope.departmentOrganizationId && Types.ObjectId.isValid(scope.departmentOrganizationId)
            ? new Types.ObjectId(scope.departmentOrganizationId)
            : undefined;
    assignment.scopeCollegeOrganizationId =
        scope.collegeOrganizationId && Types.ObjectId.isValid(scope.collegeOrganizationId)
            ? new Types.ObjectId(scope.collegeOrganizationId)
            : undefined;
    assignment.scopeUniversityOrganizationId =
        scope.universityOrganizationId && Types.ObjectId.isValid(scope.universityOrganizationId)
            ? new Types.ObjectId(scope.universityOrganizationId)
            : undefined;
    assignment.scopeOrganizationIds = toObjectIdList(scope.subjectOrganizationIds);
}

function mapDocumentRecord(record: Record<string, any>) {
    return {
        id: record._id.toString(),
        fileName: record.fileName,
        fileUrl: record.fileUrl,
        fileType: record.fileType,
        uploadedAt: record.uploadedAt,
        verificationStatus: record.verificationStatus,
        verificationRemarks: record.verificationRemarks,
    };
}

function createValueSummary(options: {
    narratives: Record<string, string | undefined>;
    sessions: number;
    deliveredSessions: number;
    assessments: number;
    completedAssessments: number;
    supports: number;
    evidenceFiles: number;
}) {
    const narrativeCount = Object.values(options.narratives).filter((value) => value?.trim()).length;
    const parts = [
        `${narrativeCount}/8 narrative sections`,
        `${options.sessions} session(s)`,
        `${options.deliveredSessions} delivered`,
        `${options.assessments} assessment(s)`,
        `${options.completedAssessments} completed`,
        `${options.supports} support action(s)`,
        `${options.evidenceFiles} evidence file(s)`,
    ];

    return parts.join(" · ");
}

async function createAuditEntry(
    actor: TeachingLearningActor | undefined,
    action: string,
    tableName: string,
    recordId: string,
    oldData?: unknown,
    newData?: unknown
) {
    if (!actor?.id) {
        return;
    }

    await createAuditLog({
        actor: {
            id: actor.id,
            name: actor.name,
            role: actor.role,
        },
        action,
        tableName,
        recordId,
        oldData,
        newData,
        auditContext: actor.auditContext,
    });
}

async function resolvePlanContext(
    academicYearId: string,
    programId: string,
    courseId: string,
    semesterId: string
) {
    const [academicYear, program, course, semester] = await Promise.all([
        AcademicYear.findById(academicYearId).select("_id yearStart yearEnd"),
        Program.findById(programId).select("_id name institutionId departmentId collegeName"),
        Course.findById(courseId).select("_id name subjectCode programId semesterId courseType credits"),
        Semester.findById(semesterId).select("_id semesterNumber"),
    ]);

    if (!academicYear) {
        throw new AuthError("Selected academic year was not found.", 404);
    }

    if (!program) {
        throw new AuthError("Selected program was not found.", 404);
    }

    if (!course) {
        throw new AuthError("Selected course was not found.", 404);
    }

    if (!semester) {
        throw new AuthError("Selected semester was not found.", 404);
    }

    if (course.programId.toString() !== program._id.toString()) {
        throw new AuthError("The selected course does not belong to the chosen program.", 400);
    }

    if (course.semesterId.toString() !== semester._id.toString()) {
        throw new AuthError("The selected course does not belong to the chosen semester.", 400);
    }

    const department = await Department.findById(program.departmentId).select(
        "_id name organizationId institutionId"
    );

    if (!department) {
        throw new AuthError("The selected program department was not found.", 404);
    }

    const institution = await Institution.findById(program.institutionId ?? department.institutionId).select(
        "_id name organizationId"
    );

    const departmentOrganizationId = department.organizationId?.toString();
    const institutionOrganizationId = institution?.organizationId?.toString();

    return {
        academicYear,
        program,
        course,
        semester,
        department,
        institution,
        scope: {
            departmentName: department.name,
            collegeName: program.collegeName ?? institution?.name,
            universityName: institution?.name,
            departmentId: department._id.toString(),
            institutionId: institution?._id?.toString(),
            departmentOrganizationId,
            collegeOrganizationId: institutionOrganizationId,
            universityOrganizationId: institutionOrganizationId,
            subjectOrganizationIds: uniqueStrings([
                departmentOrganizationId,
                institutionOrganizationId,
            ]),
        } satisfies TeachingLearningScope,
    };
}

async function loadPlanCore(planId: string) {
    if (!Types.ObjectId.isValid(planId)) {
        throw new AuthError("Teaching learning plan is invalid.", 400);
    }

    const plan = await TeachingLearningPlan.findById(planId);
    if (!plan) {
        throw new AuthError("Teaching learning plan was not found.", 404);
    }

    const context = await resolvePlanContext(
        plan.academicYearId.toString(),
        plan.programId.toString(),
        plan.courseId.toString(),
        plan.semesterId.toString()
    );

    return {
        plan,
        ...context,
    };
}

async function ensureFacultyContributor(
    userId: string,
    planScope: TeachingLearningScope
) {
    const user = await User.findById(userId).select(
        "name email role facultyId departmentId institutionId accountStatus isActive department collegeName universityName"
    );

    if (!user) {
        throw new AuthError("The selected faculty user was not found.", 404);
    }

    if (user.role !== "Faculty" || !user.isActive || user.accountStatus !== "Active") {
        throw new AuthError("Only active faculty users can be assigned teaching-learning work.", 400);
    }

    const facultyScope = user.facultyId
        ? await resolveFacultyAuthorizationScope(user.facultyId.toString())
        : {
              departmentId: user.departmentId?.toString(),
              institutionId: user.institutionId?.toString(),
          };

    if (
        facultyScope.departmentId &&
        planScope.departmentId &&
        facultyScope.departmentId !== planScope.departmentId
    ) {
        throw new AuthError(
            "The selected faculty user is outside the department scope of this plan.",
            400
        );
    }

    if (
        facultyScope.institutionId &&
        planScope.institutionId &&
        facultyScope.institutionId !== planScope.institutionId
    ) {
        throw new AuthError(
            "The selected faculty user is outside the institution scope of this plan.",
            400
        );
    }

    return user;
}

async function resolveTeachingLoadForUser(
    user: Record<string, any> | null,
    input: {
        academicYearId: string;
        programId: string;
        courseId: string;
    }
) {
    if (!user?.facultyId) {
        return null;
    }

    return FacultyTeachingLoad.findOne({
        facultyId: user.facultyId,
        academicYearId: new Types.ObjectId(input.academicYearId),
        programId: new Types.ObjectId(input.programId),
        courseId: new Types.ObjectId(input.courseId),
    });
}

async function loadAssignmentCore(assignmentId: string) {
    if (!Types.ObjectId.isValid(assignmentId)) {
        throw new AuthError("Teaching learning assignment is invalid.", 400);
    }

    const assignment = await TeachingLearningAssignment.findById(assignmentId);
    if (!assignment) {
        throw new AuthError("Teaching learning assignment was not found.", 404);
    }

    const { plan, ...context } = await loadPlanCore(assignment.planId.toString());

    return {
        assignment,
        plan,
        ...context,
    };
}

async function assignmentHasContributionData(
    assignment: InstanceType<typeof TeachingLearningAssignment>
) {
    if (
        assignment.pedagogicalApproach?.trim() ||
        assignment.learnerCentricPractices?.trim() ||
        assignment.digitalResources?.trim() ||
        assignment.attendanceStrategy?.trim() ||
        assignment.feedbackAnalysis?.trim() ||
        assignment.attainmentSummary?.trim() ||
        assignment.actionTaken?.trim() ||
        assignment.innovationHighlights?.trim() ||
        assignment.supportingLinks.length ||
        assignment.lessonPlanDocumentId ||
        assignment.questionPaperDocumentId ||
        assignment.resultAnalysisDocumentId ||
        assignment.documentIds.length ||
        assignment.contributorRemarks?.trim()
    ) {
        return true;
    }

    const [sessionCount, assessmentCount, supportCount] = await Promise.all([
        TeachingLearningSession.countDocuments({ assignmentId: assignment._id }),
        TeachingLearningAssessment.countDocuments({ assignmentId: assignment._id }),
        TeachingLearningSupport.countDocuments({ assignmentId: assignment._id }),
    ]);

    return sessionCount > 0 || assessmentCount > 0 || supportCount > 0;
}

async function syncSessions(
    assignment: InstanceType<typeof TeachingLearningAssignment>,
    input: TeachingLearningContributionDraftInput
) {
    const existingRows = await TeachingLearningSession.find({ assignmentId: assignment._id });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.sessions.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            sessionNumber: row.sessionNumber || index + 1,
            moduleTitle: row.moduleTitle || undefined,
            topic: row.topic,
            plannedDate: toOptionalDate(row.plannedDate),
            deliveredDate: toOptionalDate(row.deliveredDate),
            teachingMethod: row.teachingMethod,
            ictTool: row.ictTool || undefined,
            attendancePercent: row.attendancePercent,
            learningOutcome: row.learningOutcome || undefined,
            reflectionNotes: row.reflectionNotes || undefined,
            documentId: toOptionalObjectId(row.documentId),
            isDelivered: row.isDelivered,
            displayOrder: row.displayOrder || index + 1,
        };

        if (row._id) {
            const existing = existingById.get(row._id);
            if (!existing) {
                throw new AuthError("A teaching session entry could not be matched to this assignment.", 400);
            }

            existing.set(payload);
            await existing.save();
            keepIds.add(existing._id.toString());
            continue;
        }

        const created = await TeachingLearningSession.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await TeachingLearningSession.deleteMany({ _id: { $in: toObjectIdList(staleIds) } });
    }
}

async function syncAssessments(
    assignment: InstanceType<typeof TeachingLearningAssignment>,
    input: TeachingLearningContributionDraftInput
) {
    const existingRows = await TeachingLearningAssessment.find({ assignmentId: assignment._id });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.assessments.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            title: row.title,
            assessmentType: row.assessmentType,
            weightage: row.weightage,
            scheduledDate: toOptionalDate(row.scheduledDate),
            evaluatedDate: toOptionalDate(row.evaluatedDate),
            coMappingCodes: row.coMappingCodes,
            maxMarks: row.maxMarks,
            averageMarks: row.averageMarks,
            attainmentPercentage: row.attainmentPercentage,
            remarks: row.remarks || undefined,
            documentId: toOptionalObjectId(row.documentId),
            isCompleted: row.isCompleted,
            displayOrder: row.displayOrder || index + 1,
        };

        if (row._id) {
            const existing = existingById.get(row._id);
            if (!existing) {
                throw new AuthError("A teaching assessment entry could not be matched to this assignment.", 400);
            }

            existing.set(payload);
            await existing.save();
            keepIds.add(existing._id.toString());
            continue;
        }

        const created = await TeachingLearningAssessment.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await TeachingLearningAssessment.deleteMany({ _id: { $in: toObjectIdList(staleIds) } });
    }
}

async function syncSupports(
    assignment: InstanceType<typeof TeachingLearningAssignment>,
    input: TeachingLearningContributionDraftInput
) {
    const existingRows = await TeachingLearningSupport.find({ assignmentId: assignment._id });
    const existingById = new Map(existingRows.map((row) => [row._id.toString(), row]));
    const keepIds = new Set<string>();

    for (const [index, row] of input.supports.entries()) {
        const payload = {
            planId: assignment.planId,
            assignmentId: assignment._id,
            title: row.title,
            supportType: row.supportType,
            targetGroup: row.targetGroup || undefined,
            interventionDate: toOptionalDate(row.interventionDate),
            participantCount: row.participantCount,
            outcomeSummary: row.outcomeSummary || undefined,
            followUpAction: row.followUpAction || undefined,
            documentId: toOptionalObjectId(row.documentId),
            displayOrder: row.displayOrder || index + 1,
        };

        if (row._id) {
            const existing = existingById.get(row._id);
            if (!existing) {
                throw new AuthError("A learner support entry could not be matched to this assignment.", 400);
            }

            existing.set(payload);
            await existing.save();
            keepIds.add(existing._id.toString());
            continue;
        }

        const created = await TeachingLearningSupport.create(payload);
        keepIds.add(created._id.toString());
    }

    const staleIds = existingRows
        .map((row) => row._id.toString())
        .filter((id) => !keepIds.has(id));

    if (staleIds.length) {
        await TeachingLearningSupport.deleteMany({ _id: { $in: toObjectIdList(staleIds) } });
    }
}

async function hydrateAssignments(
    assignments: Array<Record<string, any>>,
    actor?: TeachingLearningActor
) {
    const planIds = uniqueStrings(assignments.map((item) => item.planId?.toString()));
    const assigneeIds = uniqueStrings(assignments.map((item) => item.assigneeUserId?.toString()));
    const assignmentIds = uniqueStrings(assignments.map((item) => item._id?.toString()));
    const documentIds = uniqueStrings(
        assignments.flatMap((item) => [
            ...(item.documentIds ?? []).map((value: Types.ObjectId) => value.toString()),
            item.lessonPlanDocumentId?.toString(),
            item.questionPaperDocumentId?.toString(),
            item.resultAnalysisDocumentId?.toString(),
        ])
    );

    const [plans, assignees, sessions, assessments, supports] = await Promise.all([
        planIds.length
            ? TeachingLearningPlan.find({ _id: { $in: toObjectIdList(planIds) } })
                  .populate("academicYearId", "yearStart yearEnd")
                  .populate("programId", "name")
                  .populate("courseId", "name subjectCode")
                  .populate("semesterId", "semesterNumber")
                  .lean()
            : [],
        assigneeIds.length
            ? User.find({ _id: { $in: toObjectIdList(assigneeIds) } })
                  .select("name email role facultyId department collegeName universityName")
                  .lean()
            : [],
        assignmentIds.length
            ? TeachingLearningSession.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, sessionNumber: 1 })
                  .lean()
            : [],
        assignmentIds.length
            ? TeachingLearningAssessment.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, scheduledDate: 1 })
                  .lean()
            : [],
        assignmentIds.length
            ? TeachingLearningSupport.find({ assignmentId: { $in: toObjectIdList(assignmentIds) } })
                  .sort({ displayOrder: 1, interventionDate: 1 })
                  .lean()
            : [],
    ]);

    const planById = new Map(plans.map((item) => [item._id.toString(), item]));
    const assigneeById = new Map(assignees.map((item) => [item._id.toString(), item]));

    const sourceTeachingLoadIds = uniqueStrings(
        plans.map((item) => item.sourceTeachingLoadId?.toString())
    );
    const facultyIds = uniqueStrings(assignees.map((item: Record<string, any>) => item.facultyId?.toString()));
    const academicYearIds = uniqueStrings(
        plans.map((item) => item.academicYearId?._id?.toString?.() ?? item.academicYearId?.toString())
    );
    const planDocumentIds = uniqueStrings(
        [
            ...documentIds,
            ...sessions.map((item) => item.documentId?.toString()),
            ...assessments.map((item) => item.documentId?.toString()),
            ...supports.map((item) => item.documentId?.toString()),
        ]
    );

    const [teachingLoads, teachingSummaries, documents] = await Promise.all([
        sourceTeachingLoadIds.length
            ? FacultyTeachingLoad.find({ _id: { $in: toObjectIdList(sourceTeachingLoadIds) } }).lean()
            : facultyIds.length && academicYearIds.length
              ? FacultyTeachingLoad.find({
                    facultyId: { $in: toObjectIdList(facultyIds) },
                    academicYearId: { $in: toObjectIdList(academicYearIds) },
                }).lean()
              : [],
        facultyIds.length && academicYearIds.length
            ? FacultyTeachingSummary.find({
                  facultyId: { $in: toObjectIdList(facultyIds) },
                  academicYearId: { $in: toObjectIdList(academicYearIds) },
              }).lean()
            : [],
        planDocumentIds.length
            ? DocumentModel.find({ _id: { $in: toObjectIdList(planDocumentIds) } }).lean()
            : [],
    ]);

    const documentById = new Map(documents.map((item) => [item._id.toString(), item]));
    const sessionMap = new Map<string, Array<Record<string, any>>>();
    const assessmentMap = new Map<string, Array<Record<string, any>>>();
    const supportMap = new Map<string, Array<Record<string, any>>>();

    sessions.forEach((item) => {
        const key = item.assignmentId.toString();
        const current = sessionMap.get(key) ?? [];
        current.push(item);
        sessionMap.set(key, current);
    });

    assessments.forEach((item) => {
        const key = item.assignmentId.toString();
        const current = assessmentMap.get(key) ?? [];
        current.push(item);
        assessmentMap.set(key, current);
    });

    supports.forEach((item) => {
        const key = item.assignmentId.toString();
        const current = supportMap.get(key) ?? [];
        current.push(item);
        supportMap.set(key, current);
    });

    const loadById = new Map(teachingLoads.map((item) => [item._id.toString(), item]));
    const loadByFingerprint = new Map(
        teachingLoads.map((item) => [
            [
                item.facultyId?.toString(),
                item.academicYearId?.toString(),
                item.programId?.toString(),
                item.courseId?.toString(),
            ].join(":"),
            item,
        ])
    );
    const summaryByFingerprint = new Map(
        teachingSummaries.map((item) => [
            [item.facultyId?.toString(), item.academicYearId?.toString()].join(":"),
            item,
        ])
    );

    const workflowDefinition = await getActiveWorkflowDefinition("TEACHING_LEARNING");
    const profile = actor ? await resolveAuthorizationProfile(actor) : null;

    return Promise.all(
        assignments.map(async (assignment) => {
            const assignmentId = assignment._id.toString();
            const plan = planById.get(assignment.planId.toString());
            if (!plan) {
                throw new AuthError("Teaching learning assignment references a missing plan.", 400);
            }

            const assignee = assigneeById.get(assignment.assigneeUserId.toString());
            const academicYearRef = plan.academicYearId as Record<string, any> | Types.ObjectId | undefined;
            const programRef = plan.programId as Record<string, any> | Types.ObjectId | undefined;
            const courseRef = plan.courseId as Record<string, any> | Types.ObjectId | undefined;
            const semesterRef = plan.semesterId as Record<string, any> | Types.ObjectId | undefined;
            const planAcademicYearId =
                academicYearRef && typeof academicYearRef === "object" && "_id" in academicYearRef
                    ? String(academicYearRef._id)
                    : academicYearRef
                      ? String(academicYearRef)
                      : undefined;
            const loadFingerprint = [
                assignee?.facultyId?.toString(),
                planAcademicYearId,
                programRef && typeof programRef === "object" && "_id" in programRef
                    ? String(programRef._id)
                    : programRef
                      ? String(programRef)
                      : undefined,
                courseRef && typeof courseRef === "object" && "_id" in courseRef
                    ? String(courseRef._id)
                    : courseRef
                      ? String(courseRef)
                      : undefined,
            ].join(":");
            const summaryFingerprint = [
                assignee?.facultyId?.toString(),
                planAcademicYearId,
            ].join(":");
            const teachingLoad =
                plan.sourceTeachingLoadId
                    ? loadById.get(plan.sourceTeachingLoadId.toString())
                    : loadByFingerprint.get(loadFingerprint);
            const teachingSummary = summaryByFingerprint.get(summaryFingerprint);
            const assignmentDocuments = (assignment.documentIds ?? [])
                .map((value: Types.ObjectId) => documentById.get(value.toString()))
                .filter(Boolean)
                .map((value: Record<string, any>) => mapDocumentRecord(value));
            const lessonPlanDocument = assignment.lessonPlanDocumentId
                ? documentById.get(assignment.lessonPlanDocumentId.toString())
                : undefined;
            const questionPaperDocument = assignment.questionPaperDocumentId
                ? documentById.get(assignment.questionPaperDocumentId.toString())
                : undefined;
            const resultAnalysisDocument = assignment.resultAnalysisDocumentId
                ? documentById.get(assignment.resultAnalysisDocumentId.toString())
                : undefined;
            const assignmentSessions = (sessionMap.get(assignmentId) ?? []).map((row) => {
                const document = row.documentId ? documentById.get(row.documentId.toString()) : undefined;
                return {
                    id: row._id.toString(),
                    sessionNumber: row.sessionNumber,
                    moduleTitle: row.moduleTitle,
                    topic: row.topic,
                    plannedDate: row.plannedDate,
                    deliveredDate: row.deliveredDate,
                    teachingMethod: row.teachingMethod,
                    ictTool: row.ictTool,
                    attendancePercent: row.attendancePercent,
                    learningOutcome: row.learningOutcome,
                    reflectionNotes: row.reflectionNotes,
                    isDelivered: Boolean(row.isDelivered),
                    documentId: row.documentId?.toString(),
                    document: document
                        ? {
                              id: document._id.toString(),
                              fileName: document.fileName,
                              fileUrl: document.fileUrl,
                              verificationStatus: document.verificationStatus,
                          }
                        : undefined,
                };
            });
            const assignmentAssessments = (assessmentMap.get(assignmentId) ?? []).map((row) => {
                const document = row.documentId ? documentById.get(row.documentId.toString()) : undefined;
                return {
                    id: row._id.toString(),
                    title: row.title,
                    assessmentType: row.assessmentType,
                    weightage: row.weightage,
                    scheduledDate: row.scheduledDate,
                    evaluatedDate: row.evaluatedDate,
                    coMappingCodes: row.coMappingCodes ?? [],
                    maxMarks: row.maxMarks,
                    averageMarks: row.averageMarks,
                    attainmentPercentage: row.attainmentPercentage,
                    remarks: row.remarks,
                    isCompleted: Boolean(row.isCompleted),
                    documentId: row.documentId?.toString(),
                    document: document
                        ? {
                              id: document._id.toString(),
                              fileName: document.fileName,
                              fileUrl: document.fileUrl,
                              verificationStatus: document.verificationStatus,
                          }
                        : undefined,
                };
            });
            const assignmentSupports = (supportMap.get(assignmentId) ?? []).map((row) => {
                const document = row.documentId ? documentById.get(row.documentId.toString()) : undefined;
                return {
                    id: row._id.toString(),
                    title: row.title,
                    supportType: row.supportType,
                    targetGroup: row.targetGroup,
                    interventionDate: row.interventionDate,
                    participantCount: row.participantCount,
                    outcomeSummary: row.outcomeSummary,
                    followUpAction: row.followUpAction,
                    documentId: row.documentId?.toString(),
                    document: document
                        ? {
                              id: document._id.toString(),
                              fileName: document.fileName,
                              fileUrl: document.fileUrl,
                              verificationStatus: document.verificationStatus,
                          }
                        : undefined,
                };
            });

            const currentStage = getWorkflowStageByStatus(workflowDefinition, assignment.status);
            const canView =
                actor?.role === "Admin"
                    ? true
                    : profile
                      ? canViewModuleRecord(profile, "TEACHING_LEARNING", {
                            departmentName: assignment.scopeDepartmentName,
                            collegeName: assignment.scopeCollegeName,
                            universityName: assignment.scopeUniversityName,
                            departmentId: assignment.scopeDepartmentId?.toString(),
                            institutionId: assignment.scopeInstitutionId?.toString(),
                            departmentOrganizationId: assignment.scopeDepartmentOrganizationId?.toString(),
                            collegeOrganizationId: assignment.scopeCollegeOrganizationId?.toString(),
                            universityOrganizationId: assignment.scopeUniversityOrganizationId?.toString(),
                            subjectOrganizationIds:
                                assignment.scopeOrganizationIds?.map((value: Types.ObjectId) => value.toString()) ?? [],
                        })
                      : false;
            const canReview =
                actor && currentStage
                    ? await canActorProcessWorkflowStage({
                          actor,
                          moduleName: "TEACHING_LEARNING",
                          recordId: assignmentId,
                          status: assignment.status,
                          subjectDepartmentName: assignment.scopeDepartmentName,
                          subjectCollegeName: assignment.scopeCollegeName,
                          subjectUniversityName: assignment.scopeUniversityName,
                          subjectDepartmentId: assignment.scopeDepartmentId?.toString(),
                          subjectInstitutionId: assignment.scopeInstitutionId?.toString(),
                          subjectDepartmentOrganizationId: assignment.scopeDepartmentOrganizationId?.toString(),
                          subjectCollegeOrganizationId: assignment.scopeCollegeOrganizationId?.toString(),
                          subjectUniversityOrganizationId: assignment.scopeUniversityOrganizationId?.toString(),
                          subjectOrganizationIds:
                              assignment.scopeOrganizationIds?.map((value: Types.ObjectId) => value.toString()) ?? [],
                          stageKinds: [currentStage.kind],
                      })
                    : false;
            const availableDecisions =
                currentStage?.kind === "review"
                    ? ["Forward", "Recommend", "Reject"]
                    : currentStage?.kind === "final"
                      ? ["Approve", "Reject"]
                      : [];
            const evidenceFileCount = uniqueStrings([
                assignment.lessonPlanDocumentId?.toString(),
                assignment.questionPaperDocumentId?.toString(),
                assignment.resultAnalysisDocumentId?.toString(),
                ...(assignment.documentIds ?? []).map((value: Types.ObjectId) => value.toString()),
                ...assignmentSessions.map((item) => item.documentId),
                ...assignmentAssessments.map((item) => item.documentId),
                ...assignmentSupports.map((item) => item.documentId),
            ]).length;

            return {
                _id: assignmentId,
                planId: plan._id.toString(),
                planTitle: plan.title,
                academicYearLabel:
                    academicYearRef && typeof academicYearRef === "object" && "yearStart" in academicYearRef
                        ? formatAcademicYearLabel(academicYearRef.yearStart, academicYearRef.yearEnd)
                        : "",
                programName:
                    programRef && typeof programRef === "object" && "name" in programRef
                        ? String(programRef.name)
                        : "",
                courseTitle:
                    courseRef && typeof courseRef === "object" && "name" in courseRef
                        ? String(courseRef.name)
                        : "",
                courseCode:
                    courseRef && typeof courseRef === "object" && "subjectCode" in courseRef
                        ? String(courseRef.subjectCode ?? "")
                        : "",
                semesterNumber:
                    semesterRef && typeof semesterRef === "object" && "semesterNumber" in semesterRef
                        ? Number(semesterRef.semesterNumber)
                        : undefined,
                sectionName: plan.sectionName,
                deliveryType: plan.deliveryType,
                plannedSessions: plan.plannedSessions,
                plannedContactHours: plan.plannedContactHours,
                classStrength: plan.classStrength,
                planSummary: plan.summary,
                planStatus: plan.status,
                sourceTeachingLoadId: plan.sourceTeachingLoadId?.toString(),
                teachingLoadSnapshot: teachingLoad
                    ? {
                          subjectCode: teachingLoad.subjectCode,
                          lectureHours: teachingLoad.lectureHours ?? 0,
                          tutorialHours: teachingLoad.tutorialHours ?? 0,
                          practicalHours: teachingLoad.practicalHours ?? 0,
                          totalHours: teachingLoad.totalHours ?? 0,
                          innovativePedagogy: teachingLoad.innovativePedagogy,
                      }
                    : null,
                teachingSummarySnapshot: teachingSummary
                    ? {
                          classesTaken: teachingSummary.classesTaken ?? 0,
                          coursePreparationHours: teachingSummary.coursePreparationHours ?? 0,
                          coursesTaught: teachingSummary.coursesTaught ?? [],
                          mentoringCount: teachingSummary.mentoringCount ?? 0,
                          labSupervisionCount: teachingSummary.labSupervisionCount ?? 0,
                          feedbackSummary: teachingSummary.feedbackSummary,
                      }
                    : null,
                assigneeName: assignee?.name ?? "",
                assigneeEmail: assignee?.email ?? "",
                assigneeRole: assignment.assigneeRole,
                status: assignment.status,
                dueDate: assignment.dueDate,
                notes: assignment.notes,
                pedagogicalApproach: assignment.pedagogicalApproach,
                learnerCentricPractices: assignment.learnerCentricPractices,
                digitalResources: assignment.digitalResources,
                attendanceStrategy: assignment.attendanceStrategy,
                feedbackAnalysis: assignment.feedbackAnalysis,
                attainmentSummary: assignment.attainmentSummary,
                actionTaken: assignment.actionTaken,
                innovationHighlights: assignment.innovationHighlights,
                supportingLinks: assignment.supportingLinks ?? [],
                lessonPlanDocumentId: assignment.lessonPlanDocumentId?.toString(),
                questionPaperDocumentId: assignment.questionPaperDocumentId?.toString(),
                resultAnalysisDocumentId: assignment.resultAnalysisDocumentId?.toString(),
                lessonPlanDocument: lessonPlanDocument ? mapDocumentRecord(lessonPlanDocument) : undefined,
                questionPaperDocument: questionPaperDocument
                    ? mapDocumentRecord(questionPaperDocument)
                    : undefined,
                resultAnalysisDocument: resultAnalysisDocument
                    ? mapDocumentRecord(resultAnalysisDocument)
                    : undefined,
                documentIds: (assignment.documentIds ?? []).map((value: Types.ObjectId) => value.toString()),
                documents: assignmentDocuments,
                contributorRemarks: assignment.contributorRemarks,
                reviewRemarks: assignment.reviewRemarks,
                sessions: assignmentSessions,
                assessments: assignmentAssessments,
                supports: assignmentSupports,
                reviewHistory: (assignment.reviewHistory ?? []).map((entry: Record<string, any>) => ({
                    reviewerName: entry.reviewerName,
                    reviewerRole: entry.reviewerRole,
                    stage: entry.stage,
                    decision: entry.decision,
                    remarks: entry.remarks,
                    reviewedAt: entry.reviewedAt,
                })),
                statusLogs: (assignment.statusLogs ?? []).map((entry: Record<string, any>) => ({
                    status: entry.status,
                    actorName: entry.actorName,
                    actorRole: entry.actorRole,
                    remarks: entry.remarks,
                    changedAt: entry.changedAt,
                })),
                valueSummary: createValueSummary({
                    narratives: {
                        pedagogicalApproach: assignment.pedagogicalApproach,
                        learnerCentricPractices: assignment.learnerCentricPractices,
                        digitalResources: assignment.digitalResources,
                        attendanceStrategy: assignment.attendanceStrategy,
                        feedbackAnalysis: assignment.feedbackAnalysis,
                        attainmentSummary: assignment.attainmentSummary,
                        actionTaken: assignment.actionTaken,
                        innovationHighlights: assignment.innovationHighlights,
                    },
                    sessions: assignmentSessions.length,
                    deliveredSessions: assignmentSessions.filter((item) => item.isDelivered).length,
                    assessments: assignmentAssessments.length,
                    completedAssessments: assignmentAssessments.filter((item) => item.isCompleted).length,
                    supports: assignmentSupports.length,
                    evidenceFiles: evidenceFileCount,
                }),
                submittedAt: assignment.submittedAt,
                reviewedAt: assignment.reviewedAt,
                approvedAt: assignment.approvedAt,
                updatedAt: assignment.updatedAt,
                scopeDepartmentName: assignment.scopeDepartmentName,
                scopeCollegeName: assignment.scopeCollegeName,
                scopeUniversityName: assignment.scopeUniversityName,
                currentStageLabel: currentStage?.label ?? "Draft",
                currentStageKind: currentStage?.kind ?? null,
                availableDecisions,
                permissions: {
                    canView,
                    canReview,
                    canApprove: canReview && currentStage?.kind === "final",
                    canReject: canReview,
                },
            } satisfies HydratedAssignmentRecord;
        })
    );
}

function validateContributionForSubmission(record: HydratedAssignmentRecord) {
    if (!record.pedagogicalApproach?.trim()) {
        throw new AuthError("Pedagogical approach is required before submission.", 400);
    }

    if (!record.attendanceStrategy?.trim()) {
        throw new AuthError("Attendance and student engagement strategy is required before submission.", 400);
    }

    if (!record.attainmentSummary?.trim()) {
        throw new AuthError("Attainment summary is required before submission.", 400);
    }

    if (!record.lessonPlanDocumentId) {
        throw new AuthError("Lesson plan evidence is required before submission.", 400);
    }

    if (record.assessments.length && !record.questionPaperDocumentId) {
        throw new AuthError(
            "Question paper or assessment instrument evidence is required when assessments are recorded.",
            400
        );
    }

    if (
        (record.assessments.some((item) => item.isCompleted) || record.attainmentSummary?.trim()) &&
        !record.resultAnalysisDocumentId
    ) {
        throw new AuthError("Result analysis evidence is required before submission.", 400);
    }

    if (!record.sessions.length) {
        throw new AuthError("At least one lesson delivery session is required before submission.", 400);
    }

    if (!record.assessments.length) {
        throw new AuthError("At least one assessment record is required before submission.", 400);
    }

    const evidenceCount =
        record.documents.length +
        record.sessions.filter((item) => Boolean(item.documentId)).length +
        record.assessments.filter((item) => Boolean(item.documentId)).length +
        record.supports.filter((item) => Boolean(item.documentId)).length +
        record.supportingLinks.length;

    if (!evidenceCount) {
        throw new AuthError("Attach at least one evidence file or supporting link before submission.", 400);
    }
}

export async function getTeachingLearningAdminConsole() {
    await dbConnect();

    const [plans, assignments, academicYears, programs, courses, semesters, users, departments, institutions] =
        await Promise.all([
            TeachingLearningPlan.find({})
                .populate("academicYearId", "yearStart yearEnd")
                .populate("programId", "name")
                .populate("courseId", "name subjectCode")
                .populate("semesterId", "semesterNumber")
                .sort({ updatedAt: -1 })
                .lean(),
            TeachingLearningAssignment.find({})
                .populate("planId", "title status")
                .populate("assigneeUserId", "name email")
                .sort({ updatedAt: -1 })
                .lean(),
            AcademicYear.find({}).sort({ yearStart: -1, yearEnd: -1 }).select("yearStart yearEnd isActive").lean(),
            Program.find({ isActive: true }).select("name code departmentId institutionId").sort({ name: 1 }).lean(),
            Course.find({ isActive: true }).select("name subjectCode programId semesterId courseType credits").sort({ name: 1 }).lean(),
            Semester.find({}).sort({ semesterNumber: 1 }).lean(),
            User.find({ role: "Faculty", isActive: true, accountStatus: "Active" })
                .select("name email role department collegeName universityName")
                .sort({ name: 1 })
                .lean(),
            Department.find({}).select("name institutionId").sort({ name: 1 }).lean(),
            Institution.find({}).select("name").sort({ name: 1 }).lean(),
        ]);

    return {
        plans: plans.map((plan: Record<string, any>) => ({
            _id: plan._id.toString(),
            title: plan.title,
            academicYearLabel:
                plan.academicYearId && typeof plan.academicYearId === "object" && "yearStart" in plan.academicYearId
                    ? formatAcademicYearLabel(plan.academicYearId.yearStart, plan.academicYearId.yearEnd)
                    : "",
            programName:
                plan.programId && typeof plan.programId === "object" && "name" in plan.programId
                    ? String(plan.programId.name)
                    : "",
            courseTitle:
                plan.courseId && typeof plan.courseId === "object" && "name" in plan.courseId
                    ? String(plan.courseId.name)
                    : "",
            courseCode:
                plan.courseId && typeof plan.courseId === "object" && "subjectCode" in plan.courseId
                    ? String(plan.courseId.subjectCode ?? "")
                    : "",
            semesterNumber:
                plan.semesterId && typeof plan.semesterId === "object" && "semesterNumber" in plan.semesterId
                    ? Number(plan.semesterId.semesterNumber)
                    : undefined,
            sectionName: plan.sectionName,
            deliveryType: plan.deliveryType,
            plannedSessions: plan.plannedSessions,
            plannedContactHours: plan.plannedContactHours,
            classStrength: plan.classStrength,
            summary: plan.summary,
            status: plan.status,
            facultyOwnerUserId: plan.facultyOwnerUserId?.toString(),
            updatedAt: plan.updatedAt,
        })),
        assignments: assignments.map((assignment: Record<string, any>) => ({
            _id: assignment._id.toString(),
            planId:
                assignment.planId && typeof assignment.planId === "object" && "_id" in assignment.planId
                    ? assignment.planId._id.toString()
                    : assignment.planId?.toString(),
            planTitle:
                assignment.planId && typeof assignment.planId === "object" && "title" in assignment.planId
                    ? String(assignment.planId.title)
                    : "",
            assigneeUserId:
                assignment.assigneeUserId && typeof assignment.assigneeUserId === "object" && "_id" in assignment.assigneeUserId
                    ? assignment.assigneeUserId._id.toString()
                    : assignment.assigneeUserId?.toString(),
            assigneeName:
                assignment.assigneeUserId && typeof assignment.assigneeUserId === "object" && "name" in assignment.assigneeUserId
                    ? String(assignment.assigneeUserId.name)
                    : "",
            assigneeEmail:
                assignment.assigneeUserId && typeof assignment.assigneeUserId === "object" && "email" in assignment.assigneeUserId
                    ? String(assignment.assigneeUserId.email)
                    : "",
            dueDate: assignment.dueDate,
            notes: assignment.notes,
            status: assignment.status,
            isActive: Boolean(assignment.isActive),
            updatedAt: assignment.updatedAt,
        })),
        academicYearOptions: academicYears.map((item) => ({
            id: item._id.toString(),
            label: formatAcademicYearLabel(item.yearStart, item.yearEnd),
            isActive: Boolean(item.isActive),
        })),
        programOptions: programs.map((item) => ({
            id: item._id.toString(),
            label: item.name,
            code: item.code,
            departmentId: item.departmentId?.toString?.(),
            institutionId: item.institutionId?.toString?.(),
        })),
        courseOptions: courses.map((item) => ({
            id: item._id.toString(),
            label: item.name,
            subjectCode: item.subjectCode,
            programId: item.programId?.toString?.(),
            semesterId: item.semesterId?.toString?.(),
            courseType: item.courseType,
            credits: item.credits,
        })),
        semesterOptions: semesters.map((item) => ({
            id: item._id.toString(),
            label: `Semester ${item.semesterNumber}`,
            semesterNumber: item.semesterNumber,
        })),
        userOptions: users.map((item) => ({
            id: item._id.toString(),
            label: item.name,
            email: item.email,
            department: item.department,
            collegeName: item.collegeName,
            universityName: item.universityName,
        })),
        departmentOptions: departments.map((item) => ({
            id: item._id.toString(),
            label: item.name,
            institutionId: item.institutionId?.toString?.(),
        })),
        institutionOptions: institutions.map((item) => ({
            id: item._id.toString(),
            label: item.name,
        })),
    };
}

export async function getTeachingLearningContributorWorkspace(actor: TeachingLearningActor) {
    await dbConnect();

    const assignments = await TeachingLearningAssignment.find({
        assigneeUserId: new Types.ObjectId(actor.id),
        isActive: true,
    })
        .sort({ updatedAt: -1, dueDate: 1 })
        .lean();

    const records = await hydrateAssignments(assignments, actor);
    return {
        assignments: records,
    };
}

export async function getTeachingLearningReviewWorkspace(actor: TeachingLearningActor) {
    await dbConnect();

    const profile = await resolveAuthorizationProfile(actor);
    if (actor.role !== "Admin" && !canListModuleRecords(profile, "TEACHING_LEARNING")) {
        throw new AuthError("You do not have access to teaching-learning review records.", 403);
    }

    const assignments = await TeachingLearningAssignment.find(
        actor.role === "Admin" ? {} : buildAuthorizedScopeQuery(profile)
    )
        .sort({ updatedAt: -1 })
        .lean();

    const records = await hydrateAssignments(assignments, actor);
    return {
        summary: {
            total: records.length,
            actionableCount: records.filter((item) => item.permissions.canReview || item.permissions.canApprove).length,
            pendingCount: records.filter((item) =>
                ["Submitted", "Teaching Learning Review", "Under Review", "Committee Review"].includes(item.status)
            ).length,
            approvedCount: records.filter((item) => item.status === "Approved").length,
            rejectedCount: records.filter((item) => item.status === "Rejected").length,
        },
        records,
    };
}

export async function createTeachingLearningPlan(
    actor: TeachingLearningActor,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = teachingLearningPlanSchema.parse(rawInput);
    const context = await resolvePlanContext(
        input.academicYearId,
        input.programId,
        input.courseId,
        input.semesterId
    );
    const facultyOwner = input.facultyOwnerUserId
        ? await ensureFacultyContributor(input.facultyOwnerUserId, context.scope)
        : null;
    const sourceTeachingLoad = await resolveTeachingLoadForUser(facultyOwner, {
        academicYearId: input.academicYearId,
        programId: input.programId,
        courseId: input.courseId,
    });

    const plan = new TeachingLearningPlan({
        academicYearId: new Types.ObjectId(input.academicYearId),
        programId: new Types.ObjectId(input.programId),
        courseId: new Types.ObjectId(input.courseId),
        semesterId: new Types.ObjectId(input.semesterId),
        institutionId: context.institution?._id,
        departmentId: context.department._id,
        facultyOwnerUserId: input.facultyOwnerUserId ? new Types.ObjectId(input.facultyOwnerUserId) : undefined,
        sourceTeachingLoadId: sourceTeachingLoad?._id,
        title: input.title,
        sectionName: input.sectionName || undefined,
        deliveryType: input.deliveryType,
        plannedSessions: input.plannedSessions,
        plannedContactHours:
            input.plannedContactHours || sourceTeachingLoad?.totalHours || 0,
        classStrength: input.classStrength,
        summary: input.summary,
        status: input.status,
        createdBy: new Types.ObjectId(actor.id),
    });
    copyScopeToPlan(plan, context.scope);
    await plan.save();

    await createAuditEntry(actor, "CREATE", "teaching_learning_plans", plan._id.toString(), undefined, plan.toObject());
    return plan;
}

export async function updateTeachingLearningPlan(
    actor: TeachingLearningActor,
    planId: string,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = teachingLearningPlanUpdateSchema.parse(rawInput);
    const { plan } = await loadPlanCore(planId);
    const oldData = plan.toObject();

    const hasLiveAssignments = await TeachingLearningAssignment.exists({
        planId: plan._id,
        status: { $nin: ["Draft", "Rejected"] },
    });

    const isStructuralChange =
        input.academicYearId !== undefined ||
        input.programId !== undefined ||
        input.courseId !== undefined ||
        input.semesterId !== undefined ||
        input.sectionName !== undefined;

    if (hasLiveAssignments && isStructuralChange) {
        throw new AuthError(
            "Core plan mapping cannot be changed after workflow activity has started.",
            409
        );
    }

    if (input.academicYearId || input.programId || input.courseId || input.semesterId) {
        const context = await resolvePlanContext(
            input.academicYearId ?? plan.academicYearId.toString(),
            input.programId ?? plan.programId.toString(),
            input.courseId ?? plan.courseId.toString(),
            input.semesterId ?? plan.semesterId.toString()
        );
        plan.academicYearId = new Types.ObjectId(input.academicYearId ?? plan.academicYearId.toString());
        plan.programId = new Types.ObjectId(input.programId ?? plan.programId.toString());
        plan.courseId = new Types.ObjectId(input.courseId ?? plan.courseId.toString());
        plan.semesterId = new Types.ObjectId(input.semesterId ?? plan.semesterId.toString());
        plan.departmentId = context.department._id;
        plan.institutionId = context.institution?._id;
        copyScopeToPlan(plan, context.scope);
    }

    if (input.title !== undefined) plan.title = input.title;
    if (input.sectionName !== undefined) plan.sectionName = input.sectionName || undefined;
    if (input.deliveryType !== undefined) plan.deliveryType = input.deliveryType;
    if (input.plannedSessions !== undefined) plan.plannedSessions = input.plannedSessions;
    if (input.plannedContactHours !== undefined) plan.plannedContactHours = input.plannedContactHours;
    if (input.classStrength !== undefined) plan.classStrength = input.classStrength;
    if (input.summary !== undefined) plan.summary = input.summary || undefined;
    if (input.status !== undefined) plan.status = input.status;

    if (input.facultyOwnerUserId !== undefined) {
        if (hasLiveAssignments && input.facultyOwnerUserId !== plan.facultyOwnerUserId?.toString()) {
            throw new AuthError(
                "Faculty ownership cannot be reassigned after workflow activity has started.",
                409
            );
        }

        if (input.facultyOwnerUserId) {
            const owner = await ensureFacultyContributor(input.facultyOwnerUserId, {
                departmentId: plan.scopeDepartmentId?.toString(),
                institutionId: plan.scopeInstitutionId?.toString(),
                departmentName: plan.scopeDepartmentName,
                collegeName: plan.scopeCollegeName,
                universityName: plan.scopeUniversityName,
                departmentOrganizationId: plan.scopeDepartmentOrganizationId?.toString(),
                collegeOrganizationId: plan.scopeCollegeOrganizationId?.toString(),
                universityOrganizationId: plan.scopeUniversityOrganizationId?.toString(),
                subjectOrganizationIds: plan.scopeOrganizationIds.map((value) => value.toString()),
            });
            plan.facultyOwnerUserId = new Types.ObjectId(input.facultyOwnerUserId);
            const teachingLoad = await resolveTeachingLoadForUser(owner, {
                academicYearId: plan.academicYearId.toString(),
                programId: plan.programId.toString(),
                courseId: plan.courseId.toString(),
            });
            plan.sourceTeachingLoadId = teachingLoad?._id;
        } else {
            plan.facultyOwnerUserId = undefined;
            plan.sourceTeachingLoadId = undefined;
        }
    }

    await plan.save();
    await createAuditEntry(actor, "UPDATE", "teaching_learning_plans", plan._id.toString(), oldData, plan.toObject());
    return plan;
}

export async function createTeachingLearningAssignment(
    actor: TeachingLearningActor,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = teachingLearningAssignmentSchema.parse(rawInput);
    const { plan } = await loadPlanCore(input.planId);
    const assignee = await ensureFacultyContributor(input.assigneeUserId, {
        departmentName: plan.scopeDepartmentName,
        collegeName: plan.scopeCollegeName,
        universityName: plan.scopeUniversityName,
        departmentId: plan.scopeDepartmentId?.toString(),
        institutionId: plan.scopeInstitutionId?.toString(),
        departmentOrganizationId: plan.scopeDepartmentOrganizationId?.toString(),
        collegeOrganizationId: plan.scopeCollegeOrganizationId?.toString(),
        universityOrganizationId: plan.scopeUniversityOrganizationId?.toString(),
        subjectOrganizationIds: plan.scopeOrganizationIds.map((value) => value.toString()),
    });

    if (!plan.facultyOwnerUserId) {
        plan.facultyOwnerUserId = assignee._id;
    }

    if (!plan.sourceTeachingLoadId) {
        const teachingLoad = await resolveTeachingLoadForUser(assignee, {
            academicYearId: plan.academicYearId.toString(),
            programId: plan.programId.toString(),
            courseId: plan.courseId.toString(),
        });
        plan.sourceTeachingLoadId = teachingLoad?._id;
        await plan.save();
    }

    const assignment = new TeachingLearningAssignment({
        planId: plan._id,
        assigneeUserId: assignee._id,
        assignedBy: new Types.ObjectId(actor.id),
        assigneeRole: assignee.role,
        dueDate: toOptionalDate(input.dueDate),
        notes: input.notes,
        status: "Draft",
        isActive: input.isActive,
    });
    copyScopeToAssignment(assignment, {
        departmentName: plan.scopeDepartmentName,
        collegeName: plan.scopeCollegeName,
        universityName: plan.scopeUniversityName,
        departmentId: plan.scopeDepartmentId?.toString(),
        institutionId: plan.scopeInstitutionId?.toString(),
        departmentOrganizationId: plan.scopeDepartmentOrganizationId?.toString(),
        collegeOrganizationId: plan.scopeCollegeOrganizationId?.toString(),
        universityOrganizationId: plan.scopeUniversityOrganizationId?.toString(),
        subjectOrganizationIds: plan.scopeOrganizationIds.map((value) => value.toString()),
    });
    pushStatusLog(assignment, "Draft", actor, "Teaching learning assignment created.");
    await assignment.save();

    await createAuditEntry(
        actor,
        "CREATE",
        "teaching_learning_assignments",
        assignment._id.toString(),
        undefined,
        assignment.toObject()
    );
    return assignment;
}

export async function updateTeachingLearningAssignment(
    actor: TeachingLearningActor,
    assignmentId: string,
    rawInput: unknown
) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = teachingLearningAssignmentUpdateSchema.parse(rawInput);
    const { assignment, plan } = await loadAssignmentCore(assignmentId);
    const oldData = assignment.toObject();
    const hasContributionData = await assignmentHasContributionData(assignment);

    if (
        input.assigneeUserId &&
        input.assigneeUserId !== assignment.assigneeUserId.toString()
    ) {
        if (!["Draft", "Rejected"].includes(assignment.status) || hasContributionData) {
            throw new AuthError(
                "Assignees cannot be remapped after contribution data or workflow activity exists.",
                409
            );
        }

        const assignee = await ensureFacultyContributor(input.assigneeUserId, {
            departmentName: plan.scopeDepartmentName,
            collegeName: plan.scopeCollegeName,
            universityName: plan.scopeUniversityName,
            departmentId: plan.scopeDepartmentId?.toString(),
            institutionId: plan.scopeInstitutionId?.toString(),
            departmentOrganizationId: plan.scopeDepartmentOrganizationId?.toString(),
            collegeOrganizationId: plan.scopeCollegeOrganizationId?.toString(),
            universityOrganizationId: plan.scopeUniversityOrganizationId?.toString(),
            subjectOrganizationIds: plan.scopeOrganizationIds.map((value) => value.toString()),
        });
        assignment.assigneeUserId = assignee._id;
        assignment.assigneeRole = assignee.role;
    }

    if (input.dueDate !== undefined) assignment.dueDate = toOptionalDate(input.dueDate);
    if (input.notes !== undefined) assignment.notes = input.notes || undefined;
    if (input.isActive !== undefined) assignment.isActive = input.isActive;

    await assignment.save();
    await createAuditEntry(
        actor,
        "UPDATE",
        "teaching_learning_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );
    return assignment;
}

export async function saveTeachingLearningContributionDraft(
    actor: TeachingLearningActor,
    assignmentId: string,
    rawInput: unknown
) {
    await dbConnect();

    const input = teachingLearningContributionDraftSchema.parse(rawInput);
    const { assignment, plan } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() !== actor.id) {
        throw new AuthError("This teaching-learning assignment is not mapped to your account.", 403);
    }

    if (!assignment.isActive) {
        throw new AuthError("This teaching-learning assignment is inactive.", 409);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or returned teaching-learning assignments can be edited.", 409);
    }

    if (plan.status === "Archived") {
        throw new AuthError("Archived teaching-learning plans cannot be edited.", 409);
    }

    const oldData = assignment.toObject();

    assignment.pedagogicalApproach = input.pedagogicalApproach || undefined;
    assignment.learnerCentricPractices = input.learnerCentricPractices || undefined;
    assignment.digitalResources = input.digitalResources || undefined;
    assignment.attendanceStrategy = input.attendanceStrategy || undefined;
    assignment.feedbackAnalysis = input.feedbackAnalysis || undefined;
    assignment.attainmentSummary = input.attainmentSummary || undefined;
    assignment.actionTaken = input.actionTaken || undefined;
    assignment.innovationHighlights = input.innovationHighlights || undefined;
    assignment.supportingLinks = input.supportingLinks;
    assignment.lessonPlanDocumentId = toOptionalObjectId(input.lessonPlanDocumentId);
    assignment.questionPaperDocumentId = toOptionalObjectId(input.questionPaperDocumentId);
    assignment.resultAnalysisDocumentId = toOptionalObjectId(input.resultAnalysisDocumentId);
    assignment.documentIds = toObjectIdList(input.documentIds);
    assignment.contributorRemarks = input.contributorRemarks || undefined;
    await assignment.save();

    await Promise.all([
        syncSessions(assignment, input),
        syncAssessments(assignment, input),
        syncSupports(assignment, input),
    ]);

    await createAuditEntry(
        actor,
        "DRAFT_SAVE",
        "teaching_learning_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );
    return assignment;
}

export async function submitTeachingLearningAssignment(
    actor: TeachingLearningActor,
    assignmentId: string
) {
    await dbConnect();

    const { assignment, plan } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() !== actor.id) {
        throw new AuthError("This teaching-learning assignment is not mapped to your account.", 403);
    }

    if (!assignment.isActive) {
        throw new AuthError("This teaching-learning assignment is inactive.", 409);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or returned teaching-learning assignments can be submitted.", 409);
    }

    if (plan.status !== "Active") {
        throw new AuthError("The teaching-learning plan must be active before submission.", 400);
    }

    const hydrated = (await hydrateAssignments([assignment.toObject()], actor))[0];
    validateContributionForSubmission(hydrated);

    const transition = resolveWorkflowTransition(
        await getActiveWorkflowDefinition("TEACHING_LEARNING"),
        assignment.status,
        "submit"
    );
    assignment.status = transition.status as TeachingLearningWorkflowStatus;
    assignment.submittedAt = new Date();
    assignment.reviewedAt = undefined;
    assignment.approvedAt = undefined;
    assignment.approvedBy = undefined;
    assignment.reviewRemarks = undefined;
    pushStatusLog(assignment, assignment.status, actor, "Teaching learning contribution submitted.");
    await assignment.save();

    await syncWorkflowInstanceState({
        moduleName: "TEACHING_LEARNING",
        recordId: assignment._id.toString(),
        status: assignment.status,
        subjectDepartmentName: assignment.scopeDepartmentName,
        subjectCollegeName: assignment.scopeCollegeName,
        subjectUniversityName: assignment.scopeUniversityName,
        subjectDepartmentId: assignment.scopeDepartmentId?.toString(),
        subjectInstitutionId: assignment.scopeInstitutionId?.toString(),
        subjectDepartmentOrganizationId: assignment.scopeDepartmentOrganizationId?.toString(),
        subjectCollegeOrganizationId: assignment.scopeCollegeOrganizationId?.toString(),
        subjectUniversityOrganizationId: assignment.scopeUniversityOrganizationId?.toString(),
        subjectOrganizationIds: assignment.scopeOrganizationIds.map((value) => value.toString()),
        actor,
        remarks: "Teaching learning contribution submitted.",
        action: "submit",
    });

    await createAuditEntry(
        actor,
        "SUBMIT",
        "teaching_learning_assignments",
        assignment._id.toString(),
        undefined,
        assignment.toObject()
    );
    return assignment;
}

export async function reviewTeachingLearningAssignment(
    actor: TeachingLearningActor,
    assignmentId: string,
    rawInput: unknown
) {
    await dbConnect();

    const input = teachingLearningReviewSchema.parse(rawInput);
    const { assignment } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() === actor.id && actor.role !== "Admin") {
        throw new AuthError("Contributors cannot review their own teaching-learning assignment.", 403);
    }

    const workflowDefinition = await getActiveWorkflowDefinition("TEACHING_LEARNING");
    const currentStage = getWorkflowStageByStatus(workflowDefinition, assignment.status);

    if (!currentStage) {
        throw new AuthError("This teaching-learning assignment is not pending review.", 409);
    }

    const canReview = await canActorProcessWorkflowStage({
        actor,
        moduleName: "TEACHING_LEARNING",
        recordId: assignment._id.toString(),
        status: assignment.status,
        subjectDepartmentName: assignment.scopeDepartmentName,
        subjectCollegeName: assignment.scopeCollegeName,
        subjectUniversityName: assignment.scopeUniversityName,
        subjectDepartmentId: assignment.scopeDepartmentId?.toString(),
        subjectInstitutionId: assignment.scopeInstitutionId?.toString(),
        subjectDepartmentOrganizationId: assignment.scopeDepartmentOrganizationId?.toString(),
        subjectCollegeOrganizationId: assignment.scopeCollegeOrganizationId?.toString(),
        subjectUniversityOrganizationId: assignment.scopeUniversityOrganizationId?.toString(),
        subjectOrganizationIds: assignment.scopeOrganizationIds.map((value) => value.toString()),
        stageKinds: [currentStage.kind],
    });

    if (!canReview) {
        throw new AuthError("You are not authorized to review this teaching-learning assignment.", 403);
    }

    if (currentStage.kind === "review" && !["Forward", "Recommend", "Reject"].includes(input.decision)) {
        throw new AuthError("Use Forward, Recommend, or Reject during review stages.", 400);
    }

    if (currentStage.kind === "final" && !["Approve", "Reject"].includes(input.decision)) {
        throw new AuthError("Use Approve or Reject during final approval.", 400);
    }

    const oldData = assignment.toObject();
    const action = input.decision === "Reject" ? "reject" : "approve";
    const transition = resolveWorkflowTransition(workflowDefinition, assignment.status, action);
    assignment.status = transition.status as TeachingLearningWorkflowStatus;
    assignment.reviewRemarks = input.remarks;
    assignment.reviewedAt = new Date();
    assignment.reviewHistory.push({
        reviewerId: new Types.ObjectId(actor.id),
        reviewerName: actor.name,
        reviewerRole: actor.role,
        stage: currentStage.label,
        decision: input.decision,
        remarks: input.remarks,
        reviewedAt: assignment.reviewedAt,
    });
    pushStatusLog(assignment, assignment.status, actor, input.remarks);

    if (transition.completed && transition.status === workflowDefinition.approvedStatus) {
        assignment.approvedAt = new Date();
        assignment.approvedBy = new Types.ObjectId(actor.id);
    } else if (transition.status === workflowDefinition.rejectedStatus) {
        assignment.approvedAt = undefined;
        assignment.approvedBy = undefined;
    }

    await assignment.save();

    await syncWorkflowInstanceState({
        moduleName: "TEACHING_LEARNING",
        recordId: assignment._id.toString(),
        status: assignment.status,
        subjectDepartmentName: assignment.scopeDepartmentName,
        subjectCollegeName: assignment.scopeCollegeName,
        subjectUniversityName: assignment.scopeUniversityName,
        subjectDepartmentId: assignment.scopeDepartmentId?.toString(),
        subjectInstitutionId: assignment.scopeInstitutionId?.toString(),
        subjectDepartmentOrganizationId: assignment.scopeDepartmentOrganizationId?.toString(),
        subjectCollegeOrganizationId: assignment.scopeCollegeOrganizationId?.toString(),
        subjectUniversityOrganizationId: assignment.scopeUniversityOrganizationId?.toString(),
        subjectOrganizationIds: assignment.scopeOrganizationIds.map((value) => value.toString()),
        actor,
        remarks: input.remarks,
        action,
    });

    await createAuditEntry(
        actor,
        "REVIEW",
        "teaching_learning_assignments",
        assignment._id.toString(),
        oldData,
        assignment.toObject()
    );
    return assignment;
}
