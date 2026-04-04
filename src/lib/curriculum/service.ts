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
import AcademicYear from "@/models/reference/academic-year";
import Department from "@/models/reference/department";
import DocumentModel from "@/models/reference/document";
import Institution from "@/models/reference/institution";
import Course from "@/models/academic/course";
import CurriculumAcademicCalendar from "@/models/academic/curriculum-academic-calendar";
import CurriculumAcademicCalendarEvent from "@/models/academic/curriculum-academic-calendar-event";
import CurriculumAssignment, {
    type ICurriculumAssignment,
    type CurriculumWorkflowStatus,
} from "@/models/academic/curriculum-assignment";
import CurriculumBosDecision from "@/models/academic/curriculum-bos-decision";
import CurriculumBosMeeting from "@/models/academic/curriculum-bos-meeting";
import CurriculumCourse from "@/models/academic/curriculum-course";
import CurriculumCourseOutcome from "@/models/academic/curriculum-course-outcome";
import CurriculumOutcomeMapping from "@/models/academic/curriculum-outcome-mapping";
import CurriculumPlan from "@/models/academic/curriculum-plan";
import CurriculumProgramOutcome from "@/models/academic/curriculum-program-outcome";
import CurriculumSyllabusVersion from "@/models/academic/curriculum-syllabus-version";
import CurriculumValueAddedCourse from "@/models/academic/curriculum-value-added-course";
import Program from "@/models/academic/program";
import User from "@/models/core/user";
import {
    curriculumAssignmentSchema,
    curriculumAssignmentUpdateSchema,
    curriculumBosDecisionSchema,
    curriculumBosDecisionUpdateSchema,
    curriculumBosMeetingSchema,
    curriculumBosMeetingUpdateSchema,
    curriculumCalendarEventSchema,
    curriculumCalendarEventUpdateSchema,
    curriculumCalendarSchema,
    curriculumCalendarUpdateSchema,
    curriculumContributionDraftSchema,
    curriculumCourseSchema,
    curriculumCourseUpdateSchema,
    curriculumPlanSchema,
    curriculumPlanUpdateSchema,
    curriculumProgramOutcomeSchema,
    curriculumProgramOutcomeUpdateSchema,
    curriculumReviewSchema,
    curriculumSyllabusVersionSchema,
    curriculumSyllabusVersionUpdateSchema,
    curriculumValueAddedCourseSchema,
    curriculumValueAddedCourseUpdateSchema,
} from "@/lib/curriculum/validators";

type CurriculumActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
    collegeName?: string;
    universityName?: string;
    auditContext?: AuditRequestContext;
};

type CurriculumScope = {
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

function ensureAdminActor(actor: CurriculumActor) {
    if (actor.role !== "Admin") {
        throw new AuthError("Admin access is required.", 403);
    }
}

function pushStatusLog(
    assignment: InstanceType<typeof CurriculumAssignment>,
    status: CurriculumWorkflowStatus,
    actor?: CurriculumActor,
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

function copyScopeToAssignment(
    assignment: InstanceType<typeof CurriculumAssignment>,
    scope: CurriculumScope
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

function copyScopeToPlan(
    plan: InstanceType<typeof CurriculumPlan>,
    scope: CurriculumScope
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

function formatSyllabusValueSummary(record?: Record<string, any>) {
    const parts = [
        record?.syllabusSummary ? "Summary ready" : undefined,
        record?.unitOutline ? "Units drafted" : undefined,
        record?.assessmentStrategy ? "Assessment mapped" : undefined,
        Array.isArray(record?.referenceBooks) && record.referenceBooks.length
            ? `${record.referenceBooks.length} reference book(s)`
            : undefined,
    ].filter(Boolean);

    return parts.length ? parts.join(" · ") : "Draft not completed";
}

async function createAuditEntry(
    actor: CurriculumActor | undefined,
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
        actor: { id: actor.id, name: actor.name, role: actor.role },
        action,
        tableName,
        recordId,
        oldData,
        newData,
        auditContext: actor.auditContext,
    });
}

async function resolveProgramScope(programId: string) {
    const program = await Program.findById(programId).select(
        "_id name institutionId departmentId collegeName"
    );

    if (!program) {
        throw new AuthError("Selected program was not found.", 404);
    }

    const department = await Department.findById(program.departmentId).select(
        "_id name organizationId institutionId"
    );

    if (!department) {
        throw new AuthError("Program department was not found.", 404);
    }

    const institution = await Institution.findById(
        program.institutionId ?? department.institutionId
    ).select("_id name organizationId");

    const departmentOrganizationId = department.organizationId?.toString();
    const institutionOrganizationId = institution?.organizationId?.toString();

    return {
        program,
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
        } satisfies CurriculumScope,
    };
}

async function resolveCurriculumPlanContext(curriculumId: string) {
    const plan = await CurriculumPlan.findById(curriculumId);
    if (!plan) {
        throw new AuthError("Curriculum plan was not found.", 404);
    }

    const { program, department, institution, scope } = await resolveProgramScope(
        plan.programId.toString()
    );

    return {
        plan,
        program,
        department,
        institution,
        scope,
    };
}

async function ensureFacultyAssignee(userId: string, planContext: Awaited<ReturnType<typeof resolveCurriculumPlanContext>>) {
    const user = await User.findById(userId).select(
        "name email role facultyId departmentId institutionId accountStatus isActive"
    );

    if (!user) {
        throw new AuthError("Assignee was not found.", 404);
    }

    if (user.role !== "Faculty" || !user.isActive || user.accountStatus !== "Active") {
        throw new AuthError("Only active faculty can be assigned curriculum authoring work.", 400);
    }

    const facultyScope = user.facultyId
        ? await resolveFacultyAuthorizationScope(user.facultyId.toString())
        : {
              departmentId: user.departmentId?.toString(),
              institutionId: user.institutionId?.toString(),
          };

    if (
        facultyScope.departmentId &&
        planContext.scope.departmentId &&
        facultyScope.departmentId !== planContext.scope.departmentId
    ) {
        throw new AuthError(
            "The selected faculty member is outside the curriculum department scope.",
            400
        );
    }

    return user;
}

async function loadAssignmentCore(assignmentId: string) {
    if (!Types.ObjectId.isValid(assignmentId)) {
        throw new AuthError("Curriculum assignment is invalid.", 400);
    }

    const assignment = await CurriculumAssignment.findById(assignmentId);
    if (!assignment) {
        throw new AuthError("Curriculum assignment was not found.", 404);
    }

    const [plan, course, syllabusVersion] = await Promise.all([
        CurriculumPlan.findById(assignment.curriculumId),
        CurriculumCourse.findById(assignment.curriculumCourseId),
        CurriculumSyllabusVersion.findById(assignment.syllabusVersionId),
    ]);

    if (!plan || !course || !syllabusVersion) {
        throw new AuthError("Curriculum assignment references incomplete records.", 400);
    }

    return {
        assignment,
        plan,
        course,
        syllabusVersion,
    };
}

async function hydrateWorkspaceAssignments(assignments: Record<string, any>[]) {
    const curriculumIds = uniqueStrings(assignments.map((item) => item.curriculumId?.toString()));
    const courseIds = uniqueStrings(assignments.map((item) => item.curriculumCourseId?.toString()));
    const versionIds = uniqueStrings(assignments.map((item) => item.syllabusVersionId?.toString()));
    const contributorIds = uniqueStrings(assignments.map((item) => item.assigneeUserId?.toString()));
    const documentIds = uniqueStrings(
        assignments.flatMap((item) => [
            ...((item.documentIds ?? []).map((value: Types.ObjectId) => value.toString())),
        ])
    );

    const [plans, courses, versions, contributors, programOutcomes, courseOutcomes, mappings, documents, academicYears] =
        await Promise.all([
            curriculumIds.length
                ? CurriculumPlan.find({ _id: { $in: toObjectIdList(curriculumIds) } })
                      .populate("programId", "name code degreeType")
                      .populate("departmentId", "name")
                      .populate("effectiveFromAcademicYearId", "yearStart yearEnd")
                      .lean()
                : [],
            courseIds.length
                ? CurriculumCourse.find({ _id: { $in: toObjectIdList(courseIds) } }).lean()
                : [],
            versionIds.length
                ? CurriculumSyllabusVersion.find({ _id: { $in: toObjectIdList(versionIds) } }).lean()
                : [],
            contributorIds.length
                ? User.find({ _id: { $in: toObjectIdList(contributorIds) } })
                      .select("name email role department collegeName universityName")
                      .lean()
                : [],
            curriculumIds.length
                ? CurriculumProgramOutcome.find({ curriculumId: { $in: toObjectIdList(curriculumIds) }, isActive: true })
                      .sort({ outcomeType: 1, outcomeCode: 1 })
                      .lean()
                : [],
            versionIds.length
                ? CurriculumCourseOutcome.find({ syllabusVersionId: { $in: toObjectIdList(versionIds) }, isActive: true })
                      .sort({ displayOrder: 1, coCode: 1 })
                      .lean()
                : [],
            versionIds.length
                ? CurriculumOutcomeMapping.find({ syllabusVersionId: { $in: toObjectIdList(versionIds) } }).lean()
                : [],
            documentIds.length
                ? DocumentModel.find({ _id: { $in: toObjectIdList(documentIds) } })
                      .select("fileName fileUrl fileType uploadedAt verificationStatus verificationRemarks")
                      .lean()
                : [],
            AcademicYear.find().sort({ yearStart: -1 }).lean(),
        ]);

    const departmentIds = uniqueStrings(
        (plans as Record<string, any>[]).map((item) =>
            typeof item.departmentId === "object" && item.departmentId?._id
                ? item.departmentId._id.toString()
                : item.departmentId?.toString()
        )
    );
    const meetingIds = uniqueStrings(
        (versions as Record<string, any>[]).map((item) => item.approvedByBosMeetingId?.toString())
    );
    const meetings = await CurriculumBosMeeting.find({
        $or: [
            departmentIds.length
                ? { departmentId: { $in: toObjectIdList(departmentIds) } }
                : { _id: { $in: [] } },
            meetingIds.length ? { _id: { $in: toObjectIdList(meetingIds) } } : { _id: { $in: [] } },
        ],
    })
        .sort({ meetingDate: -1 })
        .lean();

    const planMap = new Map(plans.map((item: Record<string, any>) => [item._id.toString(), item]));
    const courseMap = new Map(courses.map((item: Record<string, any>) => [item._id.toString(), item]));
    const versionMap = new Map(versions.map((item: Record<string, any>) => [item._id.toString(), item]));
    const contributorMap = new Map(
        contributors.map((item: Record<string, any>) => [item._id.toString(), item])
    );
    const documentMap = new Map(documents.map((item: Record<string, any>) => [item._id.toString(), item]));
    const meetingMap = new Map(meetings.map((item: Record<string, any>) => [item._id.toString(), item]));
    const programOutcomesByCurriculum = new Map<string, Record<string, any>[]>();
    const courseOutcomesByVersion = new Map<string, Record<string, any>[]>();
    const mappingsByVersion = new Map<string, Record<string, any>[]>();

    for (const outcome of programOutcomes as Record<string, any>[]) {
        const key = outcome.curriculumId.toString();
        const items = programOutcomesByCurriculum.get(key) ?? [];
        items.push(outcome);
        programOutcomesByCurriculum.set(key, items);
    }

    for (const outcome of courseOutcomes as Record<string, any>[]) {
        const key = outcome.syllabusVersionId.toString();
        const items = courseOutcomesByVersion.get(key) ?? [];
        items.push(outcome);
        courseOutcomesByVersion.set(key, items);
    }

    for (const mapping of mappings as Record<string, any>[]) {
        const key = mapping.syllabusVersionId.toString();
        const items = mappingsByVersion.get(key) ?? [];
        items.push(mapping);
        mappingsByVersion.set(key, items);
    }

    return {
        planMap,
        courseMap,
        versionMap,
        contributorMap,
        documentMap,
        meetingMap,
        programOutcomesByCurriculum,
        courseOutcomesByVersion,
        mappingsByVersion,
        academicYearOptions: academicYears.map((item: Record<string, any>) => ({
            id: item._id.toString(),
            label: formatAcademicYearLabel(item.yearStart, item.yearEnd),
            isActive: Boolean(item.isActive),
        })),
    };
}

function toReferenceBookList(value: string[] | undefined) {
    return (value ?? []).map((item) => String(item).trim()).filter(Boolean);
}

export async function getCurriculumAdminConsole() {
    await dbConnect();

    const [
        calendars,
        calendarEvents,
        plans,
        curriculumCourses,
        syllabusVersions,
        programOutcomes,
        bosMeetings,
        bosDecisions,
        valueAddedCourses,
        assignments,
        institutions,
        academicYears,
        programs,
        courseMasters,
        users,
        departments,
    ] = await Promise.all([
        CurriculumAcademicCalendar.find()
            .populate("institutionId", "name")
            .populate("academicYearId", "yearStart yearEnd isActive")
            .sort({ updatedAt: -1 })
            .lean(),
        CurriculumAcademicCalendarEvent.find().sort({ startDate: -1 }).lean(),
        CurriculumPlan.find()
            .populate("programId", "name code degreeType")
            .populate("departmentId", "name")
            .populate("institutionId", "name")
            .populate("effectiveFromAcademicYearId", "yearStart yearEnd isActive")
            .sort({ updatedAt: -1 })
            .lean(),
        CurriculumCourse.find().sort({ updatedAt: -1 }).lean(),
        CurriculumSyllabusVersion.find()
            .populate("officialDocumentId", "fileName fileUrl")
            .populate("effectiveAcademicYearId", "yearStart yearEnd")
            .populate("approvedByBosMeetingId", "title meetingDate")
            .sort({ updatedAt: -1 })
            .lean(),
        CurriculumProgramOutcome.find().sort({ updatedAt: -1 }).lean(),
        CurriculumBosMeeting.find()
            .populate("departmentId", "name")
            .populate("academicYearId", "yearStart yearEnd")
            .populate("minutesDocumentId", "fileName fileUrl")
            .sort({ meetingDate: -1 })
            .lean(),
        CurriculumBosDecision.find()
            .populate("meetingId", "title meetingDate")
            .populate("implementedAcademicYearId", "yearStart yearEnd")
            .sort({ updatedAt: -1 })
            .lean(),
        CurriculumValueAddedCourse.find()
            .populate("departmentId", "name")
            .populate("academicYearId", "yearStart yearEnd")
            .populate("coordinatorUserId", "name email")
            .populate("documentId", "fileName fileUrl")
            .sort({ updatedAt: -1 })
            .lean(),
        CurriculumAssignment.find()
            .populate("assigneeUserId", "name email role department")
            .sort({ updatedAt: -1 })
            .lean(),
        Institution.find({}).sort({ name: 1 }).lean(),
        AcademicYear.find({}).sort({ yearStart: -1 }).lean(),
        Program.find({}).sort({ name: 1 }).lean(),
        Course.find({}).populate("programId", "name").populate("semesterId", "semesterNumber").sort({ name: 1 }).lean(),
        User.find({
            isActive: true,
            accountStatus: "Active",
            role: { $in: ["Faculty", "Admin"] },
        })
            .sort({ name: 1 })
            .select("name email role department collegeName universityName")
            .lean(),
        Department.find({}).sort({ name: 1 }).lean(),
    ]);

    return {
        calendars: calendars.map((item: Record<string, any>) => ({
            _id: item._id.toString(),
            institutionId:
                typeof item.institutionId === "object" && item.institutionId?._id
                    ? item.institutionId._id.toString()
                    : "",
            institutionName:
                typeof item.institutionId === "object" ? item.institutionId?.name ?? "" : "",
            academicYearId:
                typeof item.academicYearId === "object" && item.academicYearId?._id
                    ? item.academicYearId._id.toString()
                    : "",
            academicYearLabel:
                typeof item.academicYearId === "object"
                    ? formatAcademicYearLabel(
                          item.academicYearId?.yearStart,
                          item.academicYearId?.yearEnd
                      )
                    : "",
            title: item.title,
            startDate: item.startDate,
            endDate: item.endDate,
            status: item.status,
            approvedAt: item.approvedAt,
            updatedAt: item.updatedAt,
        })),
        calendarEvents: calendarEvents.map((item: Record<string, any>) => ({
            _id: item._id.toString(),
            calendarId: item.calendarId.toString(),
            eventTitle: item.eventTitle,
            eventType: item.eventType,
            startDate: item.startDate,
            endDate: item.endDate,
            description: item.description,
        })),
        plans: plans.map((item: Record<string, any>) => ({
            _id: item._id.toString(),
            programId:
                typeof item.programId === "object" && item.programId?._id
                    ? item.programId._id.toString()
                    : "",
            programName: typeof item.programId === "object" ? item.programId?.name ?? "" : "",
            programCode: typeof item.programId === "object" ? item.programId?.code ?? "" : "",
            departmentId:
                typeof item.departmentId === "object" && item.departmentId?._id
                    ? item.departmentId._id.toString()
                    : "",
            departmentName: typeof item.departmentId === "object" ? item.departmentId?.name ?? "" : "",
            institutionId:
                typeof item.institutionId === "object" && item.institutionId?._id
                    ? item.institutionId._id.toString()
                    : "",
            institutionName: typeof item.institutionId === "object" ? item.institutionId?.name ?? "" : "",
            effectiveFromAcademicYearId:
                typeof item.effectiveFromAcademicYearId === "object" && item.effectiveFromAcademicYearId?._id
                    ? item.effectiveFromAcademicYearId._id.toString()
                    : "",
            effectiveFromAcademicYearLabel:
                typeof item.effectiveFromAcademicYearId === "object"
                    ? formatAcademicYearLabel(
                          item.effectiveFromAcademicYearId?.yearStart,
                          item.effectiveFromAcademicYearId?.yearEnd
                      )
                    : "",
            title: item.title,
            regulationYear: item.regulationYear,
            totalCredits: item.totalCredits,
            status: item.status,
            summary: item.summary,
        })),
        curriculumCourses: curriculumCourses.map((item: Record<string, any>) => ({
            _id: item._id.toString(),
            curriculumId: item.curriculumId.toString(),
            courseId: item.courseId?.toString() ?? "",
            courseCode: item.courseCode,
            courseTitle: item.courseTitle,
            courseType: item.courseType,
            credits: item.credits,
            lectureHours: item.lectureHours,
            tutorialHours: item.tutorialHours,
            practicalHours: item.practicalHours,
            semesterNumber: item.semesterNumber,
            displayOrder: item.displayOrder,
            facultyOwnerUserId: item.facultyOwnerUserId?.toString() ?? "",
            isActive: Boolean(item.isActive),
        })),
        syllabusVersions: syllabusVersions.map((item: Record<string, any>) => ({
            _id: item._id.toString(),
            curriculumId: item.curriculumId.toString(),
            curriculumCourseId: item.curriculumCourseId.toString(),
            versionNumber: item.versionNumber,
            revisionReason: item.revisionReason,
            syllabusSummary: item.syllabusSummary,
            unitOutline: item.unitOutline,
            pedagogy: item.pedagogy,
            assessmentStrategy: item.assessmentStrategy,
            referenceBooks: item.referenceBooks ?? [],
            officialDocumentId:
                typeof item.officialDocumentId === "object" && item.officialDocumentId?._id
                    ? item.officialDocumentId._id.toString()
                    : item.officialDocumentId?.toString() ?? "",
            officialDocumentName:
                typeof item.officialDocumentId === "object" ? item.officialDocumentId?.fileName ?? "" : "",
            approvedByBosMeetingId:
                typeof item.approvedByBosMeetingId === "object" && item.approvedByBosMeetingId?._id
                    ? item.approvedByBosMeetingId._id.toString()
                    : item.approvedByBosMeetingId?.toString() ?? "",
            approvedByBosMeetingLabel:
                typeof item.approvedByBosMeetingId === "object"
                    ? `${item.approvedByBosMeetingId?.title ?? ""}`
                    : "",
            effectiveAcademicYearId:
                typeof item.effectiveAcademicYearId === "object" && item.effectiveAcademicYearId?._id
                    ? item.effectiveAcademicYearId._id.toString()
                    : item.effectiveAcademicYearId?.toString() ?? "",
            effectiveAcademicYearLabel:
                typeof item.effectiveAcademicYearId === "object"
                    ? formatAcademicYearLabel(
                          item.effectiveAcademicYearId?.yearStart,
                          item.effectiveAcademicYearId?.yearEnd
                      )
                    : "",
            status: item.status,
            updatedAt: item.updatedAt,
        })),
        programOutcomes: programOutcomes.map((item: Record<string, any>) => ({
            _id: item._id.toString(),
            curriculumId: item.curriculumId.toString(),
            programId: item.programId.toString(),
            outcomeType: item.outcomeType,
            outcomeCode: item.outcomeCode,
            description: item.description,
            isActive: Boolean(item.isActive),
        })),
        bosMeetings: bosMeetings.map((item: Record<string, any>) => ({
            _id: item._id.toString(),
            departmentId:
                typeof item.departmentId === "object" && item.departmentId?._id
                    ? item.departmentId._id.toString()
                    : "",
            departmentName: typeof item.departmentId === "object" ? item.departmentId?.name ?? "" : "",
            academicYearId:
                typeof item.academicYearId === "object" && item.academicYearId?._id
                    ? item.academicYearId._id.toString()
                    : "",
            academicYearLabel:
                typeof item.academicYearId === "object"
                    ? formatAcademicYearLabel(item.academicYearId?.yearStart, item.academicYearId?.yearEnd)
                    : "",
            title: item.title,
            meetingDate: item.meetingDate,
            agenda: item.agenda,
            minutesDocumentId:
                typeof item.minutesDocumentId === "object" && item.minutesDocumentId?._id
                    ? item.minutesDocumentId._id.toString()
                    : item.minutesDocumentId?.toString() ?? "",
            minutesDocumentName:
                typeof item.minutesDocumentId === "object" ? item.minutesDocumentId?.fileName ?? "" : "",
        })),
        bosDecisions: bosDecisions.map((item: Record<string, any>) => ({
            _id: item._id.toString(),
            meetingId:
                typeof item.meetingId === "object" && item.meetingId?._id
                    ? item.meetingId._id.toString()
                    : "",
            meetingTitle: typeof item.meetingId === "object" ? item.meetingId?.title ?? "" : "",
            curriculumId: item.curriculumId?.toString() ?? "",
            curriculumCourseId: item.curriculumCourseId?.toString() ?? "",
            decisionTitle: item.decisionTitle,
            decisionType: item.decisionType,
            description: item.description,
            status: item.status,
            implementedAcademicYearId:
                typeof item.implementedAcademicYearId === "object" && item.implementedAcademicYearId?._id
                    ? item.implementedAcademicYearId._id.toString()
                    : "",
            implementedAcademicYearLabel:
                typeof item.implementedAcademicYearId === "object"
                    ? formatAcademicYearLabel(
                          item.implementedAcademicYearId?.yearStart,
                          item.implementedAcademicYearId?.yearEnd
                      )
                    : "",
        })),
        valueAddedCourses: valueAddedCourses.map((item: Record<string, any>) => ({
            _id: item._id.toString(),
            departmentId:
                typeof item.departmentId === "object" && item.departmentId?._id
                    ? item.departmentId._id.toString()
                    : "",
            departmentName: typeof item.departmentId === "object" ? item.departmentId?.name ?? "" : "",
            academicYearId:
                typeof item.academicYearId === "object" && item.academicYearId?._id
                    ? item.academicYearId._id.toString()
                    : "",
            academicYearLabel:
                typeof item.academicYearId === "object"
                    ? formatAcademicYearLabel(item.academicYearId?.yearStart, item.academicYearId?.yearEnd)
                    : "",
            title: item.title,
            courseCode: item.courseCode,
            credits: item.credits,
            contactHours: item.contactHours,
            coordinatorUserId:
                typeof item.coordinatorUserId === "object" && item.coordinatorUserId?._id
                    ? item.coordinatorUserId._id.toString()
                    : item.coordinatorUserId?.toString() ?? "",
            coordinatorName: typeof item.coordinatorUserId === "object" ? item.coordinatorUserId?.name ?? "" : "",
            startDate: item.startDate,
            endDate: item.endDate,
            status: item.status,
            description: item.description,
            documentId:
                typeof item.documentId === "object" && item.documentId?._id
                    ? item.documentId._id.toString()
                    : item.documentId?.toString() ?? "",
            documentName: typeof item.documentId === "object" ? item.documentId?.fileName ?? "" : "",
        })),
        assignments: assignments.map((item: Record<string, any>) => ({
            _id: item._id.toString(),
            curriculumId: item.curriculumId.toString(),
            curriculumCourseId: item.curriculumCourseId.toString(),
            syllabusVersionId: item.syllabusVersionId.toString(),
            assigneeUserId:
                typeof item.assigneeUserId === "object" && item.assigneeUserId?._id
                    ? item.assigneeUserId._id.toString()
                    : "",
            assigneeName: typeof item.assigneeUserId === "object" ? item.assigneeUserId?.name ?? "" : "",
            assigneeEmail: typeof item.assigneeUserId === "object" ? item.assigneeUserId?.email ?? "" : "",
            assigneeRole: item.assigneeRole,
            dueDate: item.dueDate,
            notes: item.notes,
            status: item.status,
            isActive: Boolean(item.isActive),
            supportingLinkCount: item.supportingLinks?.length ?? 0,
            documentCount: item.documentIds?.length ?? 0,
            updatedAt: item.updatedAt,
        })),
        institutionOptions: institutions.map((item: Record<string, any>) => ({
            id: item._id.toString(),
            label: item.name,
        })),
        academicYearOptions: academicYears.map((item: Record<string, any>) => ({
            id: item._id.toString(),
            label: formatAcademicYearLabel(item.yearStart, item.yearEnd),
            isActive: Boolean(item.isActive),
        })),
        programOptions: programs.map((item: Record<string, any>) => ({
            id: item._id.toString(),
            label: item.code ? `${item.code} · ${item.name}` : item.name,
            departmentId: item.departmentId?.toString() ?? "",
            institutionId: item.institutionId?.toString() ?? "",
        })),
        courseMasterOptions: courseMasters.map((item: Record<string, any>) => ({
            id: item._id.toString(),
            label: item.subjectCode ? `${item.subjectCode} · ${item.name}` : item.name,
            programId:
                typeof item.programId === "object" && item.programId?._id
                    ? item.programId._id.toString()
                    : item.programId?.toString() ?? "",
            semesterNumber:
                typeof item.semesterId === "object" ? item.semesterId?.semesterNumber ?? undefined : undefined,
        })),
        userOptions: users.map((item: Record<string, any>) => ({
            id: item._id.toString(),
            name: item.name,
            email: item.email,
            role: item.role,
            department: item.department,
            collegeName: item.collegeName,
            universityName: item.universityName,
        })),
        departmentOptions: departments.map((item: Record<string, any>) => ({
            id: item._id.toString(),
            label: item.name,
            institutionId: item.institutionId?.toString() ?? "",
        })),
    };
}

export async function getCurriculumContributorWorkspace(actor: CurriculumActor) {
    await dbConnect();

    const assignments = await CurriculumAssignment.find({
        assigneeUserId: new Types.ObjectId(actor.id),
        isActive: true,
    })
        .sort({ dueDate: 1, updatedAt: -1 })
        .lean();

    if (!assignments.length) {
        return {
            assignments: [],
            academicYearOptions: [],
        };
    }

    const workflowDefinition = await getActiveWorkflowDefinition("CURRICULUM");
    const {
        planMap,
        courseMap,
        versionMap,
        contributorMap,
        documentMap,
        meetingMap,
        programOutcomesByCurriculum,
        courseOutcomesByVersion,
        mappingsByVersion,
        academicYearOptions,
    } = await hydrateWorkspaceAssignments(assignments);

    return {
        assignments: assignments.map((item: Record<string, any>) => {
            const plan = planMap.get(item.curriculumId.toString());
            const course = courseMap.get(item.curriculumCourseId.toString());
            const version = versionMap.get(item.syllabusVersionId.toString());
            const contributor = contributorMap.get(item.assigneeUserId.toString());
            const programOutcomes = programOutcomesByCurriculum.get(item.curriculumId.toString()) ?? [];
            const courseOutcomes = courseOutcomesByVersion.get(item.syllabusVersionId.toString()) ?? [];
            const mappings = mappingsByVersion.get(item.syllabusVersionId.toString()) ?? [];
            const stage = getWorkflowStageByStatus(workflowDefinition, item.status);

            return {
                _id: item._id.toString(),
                curriculumId: item.curriculumId.toString(),
                curriculumTitle: plan?.title ?? "",
                regulationYear: plan?.regulationYear ?? "",
                planStatus: plan?.status ?? "Draft",
                programName:
                    typeof plan?.programId === "object" ? plan.programId?.name ?? "" : "",
                curriculumCourseId: item.curriculumCourseId.toString(),
                courseCode: course?.courseCode ?? "",
                courseTitle: course?.courseTitle ?? "",
                courseType: course?.courseType ?? "",
                semesterNumber: course?.semesterNumber ?? 0,
                credits: course?.credits ?? 0,
                lectureHours: course?.lectureHours ?? 0,
                tutorialHours: course?.tutorialHours ?? 0,
                practicalHours: course?.practicalHours ?? 0,
                assigneeName: contributor?.name ?? "",
                assigneeEmail: contributor?.email ?? "",
                status: item.status,
                dueDate: item.dueDate,
                notes: item.notes,
                currentStageLabel: stage?.label ?? "Closed",
                syllabusVersion: {
                    _id: version?._id?.toString() ?? item.syllabusVersionId.toString(),
                    versionNumber: version?.versionNumber ?? 1,
                    revisionReason: version?.revisionReason ?? "",
                    syllabusSummary: version?.syllabusSummary ?? "",
                    unitOutline: version?.unitOutline ?? "",
                    pedagogy: version?.pedagogy ?? "",
                    assessmentStrategy: version?.assessmentStrategy ?? "",
                    referenceBooks: toReferenceBookList(version?.referenceBooks),
                    officialDocumentId: version?.officialDocumentId?.toString() ?? "",
                    approvedByBosMeetingId: version?.approvedByBosMeetingId?.toString() ?? "",
                    effectiveAcademicYearId: version?.effectiveAcademicYearId?.toString() ?? "",
                    status: version?.status ?? item.status,
                    valueSummary: formatSyllabusValueSummary(version),
                },
                programOutcomes: programOutcomes.map((outcome) => ({
                    id: outcome._id.toString(),
                    outcomeType: outcome.outcomeType,
                    outcomeCode: outcome.outcomeCode,
                    description: outcome.description,
                })),
                courseOutcomes: courseOutcomes.map((outcome) => ({
                    id: outcome._id.toString(),
                    coCode: outcome.coCode,
                    description: outcome.description,
                    bloomLevel: outcome.bloomLevel,
                    targetAttainmentPercentage: outcome.targetAttainmentPercentage,
                })),
                mappings: mappings.map((mapping) => {
                    const courseOutcome = courseOutcomes.find(
                        (outcome) => outcome._id.toString() === mapping.courseOutcomeId.toString()
                    );
                    const programOutcome = programOutcomes.find(
                        (outcome) => outcome._id.toString() === mapping.programOutcomeId.toString()
                    );

                    return {
                        id: mapping._id.toString(),
                        courseOutcomeCode: courseOutcome?.coCode ?? "",
                        programOutcomeId: mapping.programOutcomeId.toString(),
                        programOutcomeCode: programOutcome?.outcomeCode ?? "",
                        programOutcomeType: programOutcome?.outcomeType ?? "",
                        mappingStrength: mapping.mappingStrength,
                    };
                }),
                supportingLinks: item.supportingLinks ?? [],
                documentIds: (item.documentIds ?? []).map((value: Types.ObjectId) => value.toString()),
                documents: (item.documentIds ?? [])
                    .map((value: Types.ObjectId) => documentMap.get(value.toString()))
                    .filter(Boolean)
                    .map(mapDocumentRecord),
                contributorRemarks: item.contributorRemarks ?? "",
                reviewRemarks: item.reviewRemarks ?? "",
                reviewHistory: (item.reviewHistory ?? []).map((entry: Record<string, any>) => ({
                    reviewerName: entry.reviewerName,
                    reviewerRole: entry.reviewerRole,
                    stage: entry.stage,
                    decision: entry.decision,
                    remarks: entry.remarks,
                    reviewedAt: entry.reviewedAt,
                })),
                statusLogs: (item.statusLogs ?? []).map((entry: Record<string, any>) => ({
                    status: entry.status,
                    actorName: entry.actorName,
                    actorRole: entry.actorRole,
                    remarks: entry.remarks,
                    changedAt: entry.changedAt,
                })),
                bosMeetings: Array.from(meetingMap.values()).map((meeting: Record<string, any>) => ({
                    id: meeting._id.toString(),
                    title: meeting.title,
                    meetingDate: meeting.meetingDate,
                })),
            };
        }),
        academicYearOptions,
    };
}

export async function getCurriculumReviewWorkspace(actor: CurriculumActor) {
    await dbConnect();

    const profile = await resolveAuthorizationProfile(actor);
    if (actor.role !== "Admin" && !canListModuleRecords(profile, "CURRICULUM")) {
        throw new AuthError("Leadership access is required to review curriculum submissions.", 403);
    }

    const query = actor.role === "Admin" ? {} : buildAuthorizedScopeQuery(profile);
    const assignments = await CurriculumAssignment.find(query).sort({ updatedAt: -1 }).lean();
    const workflowDefinition = await getActiveWorkflowDefinition("CURRICULUM");
    const {
        planMap,
        courseMap,
        versionMap,
        contributorMap,
        documentMap,
        meetingMap,
        programOutcomesByCurriculum,
        courseOutcomesByVersion,
        mappingsByVersion,
    } = await hydrateWorkspaceAssignments(assignments);

    const records = (
        await Promise.all(
            assignments.map(async (item: Record<string, any>) => {
                const plan = planMap.get(item.curriculumId.toString());
                const course = courseMap.get(item.curriculumCourseId.toString());
                const version = versionMap.get(item.syllabusVersionId.toString());
                const contributor = contributorMap.get(item.assigneeUserId.toString());
                const programOutcomes = programOutcomesByCurriculum.get(item.curriculumId.toString()) ?? [];
                const courseOutcomes = courseOutcomesByVersion.get(item.syllabusVersionId.toString()) ?? [];
                const mappings = mappingsByVersion.get(item.syllabusVersionId.toString()) ?? [];
                const stage = getWorkflowStageByStatus(workflowDefinition, item.status);

                const subjectScope = {
                    departmentName: item.scopeDepartmentName,
                    collegeName: item.scopeCollegeName,
                    universityName: item.scopeUniversityName,
                    departmentId: item.scopeDepartmentId?.toString(),
                    institutionId: item.scopeInstitutionId?.toString(),
                    departmentOrganizationId: item.scopeDepartmentOrganizationId?.toString(),
                    collegeOrganizationId: item.scopeCollegeOrganizationId?.toString(),
                    universityOrganizationId: item.scopeUniversityOrganizationId?.toString(),
                    subjectOrganizationIds:
                        item.scopeOrganizationIds?.map((value: Types.ObjectId) => value.toString()) ?? [],
                };

                const canView =
                    actor.role === "Admin"
                        ? true
                        : canViewModuleRecord(profile, "CURRICULUM", subjectScope);

                if (!canView) {
                    return null;
                }

                const canProcessStage = stage
                    ? await canActorProcessWorkflowStage({
                          actor,
                          moduleName: "CURRICULUM",
                          recordId: item._id.toString(),
                          status: item.status,
                          subjectDepartmentName: item.scopeDepartmentName,
                          subjectCollegeName: item.scopeCollegeName,
                          subjectUniversityName: item.scopeUniversityName,
                          subjectDepartmentId: item.scopeDepartmentId?.toString(),
                          subjectInstitutionId: item.scopeInstitutionId?.toString(),
                          subjectDepartmentOrganizationId:
                              item.scopeDepartmentOrganizationId?.toString(),
                          subjectCollegeOrganizationId: item.scopeCollegeOrganizationId?.toString(),
                          subjectUniversityOrganizationId:
                              item.scopeUniversityOrganizationId?.toString(),
                          subjectOrganizationIds:
                              item.scopeOrganizationIds?.map((value: Types.ObjectId) => value.toString()) ?? [],
                          stageKinds: [stage.kind],
                      })
                    : false;

                const availableDecisions = stage
                    ? stage.kind === "final"
                        ? ["Approve", "Reject"]
                        : item.status === "Submitted"
                          ? ["Forward", "Reject"]
                          : ["Recommend", "Reject"]
                    : [];

                return {
                    _id: item._id.toString(),
                    curriculumId: item.curriculumId.toString(),
                    curriculumTitle: plan?.title ?? "",
                    regulationYear: plan?.regulationYear ?? "",
                    programName:
                        typeof plan?.programId === "object" ? plan.programId?.name ?? "" : "",
                    courseCode: course?.courseCode ?? "",
                    courseTitle: course?.courseTitle ?? "",
                    courseType: course?.courseType ?? "",
                    semesterNumber: course?.semesterNumber ?? 0,
                    credits: course?.credits ?? 0,
                    contributorName: contributor?.name ?? "",
                    contributorEmail: contributor?.email ?? "",
                    contributorRole: contributor?.role ?? "",
                    status: item.status,
                    dueDate: item.dueDate,
                    notes: item.notes,
                    valueSummary: formatSyllabusValueSummary(version),
                    syllabusVersion: {
                        versionNumber: version?.versionNumber ?? 1,
                        revisionReason: version?.revisionReason ?? "",
                        syllabusSummary: version?.syllabusSummary ?? "",
                        unitOutline: version?.unitOutline ?? "",
                        pedagogy: version?.pedagogy ?? "",
                        assessmentStrategy: version?.assessmentStrategy ?? "",
                        referenceBooks: toReferenceBookList(version?.referenceBooks),
                        officialDocumentId: version?.officialDocumentId?.toString() ?? "",
                        approvedByBosMeetingId: version?.approvedByBosMeetingId?.toString() ?? "",
                        approvedByBosMeetingLabel:
                            version?.approvedByBosMeetingId &&
                            meetingMap.get(version.approvedByBosMeetingId.toString())
                                ? meetingMap.get(version.approvedByBosMeetingId.toString())?.title ?? ""
                                : "",
                        effectiveAcademicYearId: version?.effectiveAcademicYearId?.toString() ?? "",
                        status: version?.status ?? item.status,
                    },
                    programOutcomes: programOutcomes.map((outcome) => ({
                        id: outcome._id.toString(),
                        outcomeType: outcome.outcomeType,
                        outcomeCode: outcome.outcomeCode,
                        description: outcome.description,
                    })),
                    courseOutcomes: courseOutcomes.map((outcome) => ({
                        id: outcome._id.toString(),
                        coCode: outcome.coCode,
                        description: outcome.description,
                        bloomLevel: outcome.bloomLevel,
                        targetAttainmentPercentage: outcome.targetAttainmentPercentage,
                    })),
                    mappings: mappings.map((mapping) => {
                        const courseOutcome = courseOutcomes.find(
                            (outcome) => outcome._id.toString() === mapping.courseOutcomeId.toString()
                        );
                        const programOutcome = programOutcomes.find(
                            (outcome) => outcome._id.toString() === mapping.programOutcomeId.toString()
                        );

                        return {
                            id: mapping._id.toString(),
                            courseOutcomeCode: courseOutcome?.coCode ?? "",
                            programOutcomeCode: programOutcome?.outcomeCode ?? "",
                            programOutcomeType: programOutcome?.outcomeType ?? "",
                            mappingStrength: mapping.mappingStrength,
                        };
                    }),
                    supportingLinks: item.supportingLinks ?? [],
                    documents: (item.documentIds ?? [])
                        .map((value: Types.ObjectId) => documentMap.get(value.toString()))
                        .filter(Boolean)
                        .map(mapDocumentRecord),
                    contributorRemarks: item.contributorRemarks ?? "",
                    reviewRemarks: item.reviewRemarks ?? "",
                    reviewHistory: (item.reviewHistory ?? []).map((entry: Record<string, any>) => ({
                        reviewerName: entry.reviewerName,
                        reviewerRole: entry.reviewerRole,
                        stage: entry.stage,
                        decision: entry.decision,
                        remarks: entry.remarks,
                        reviewedAt: entry.reviewedAt,
                    })),
                    statusLogs: (item.statusLogs ?? []).map((entry: Record<string, any>) => ({
                        status: entry.status,
                        actorName: entry.actorName,
                        actorRole: entry.actorRole,
                        remarks: entry.remarks,
                        changedAt: entry.changedAt,
                    })),
                    submittedAt: item.submittedAt,
                    reviewedAt: item.reviewedAt,
                    approvedAt: item.approvedAt,
                    updatedAt: item.updatedAt,
                    scopeDepartmentName: item.scopeDepartmentName,
                    scopeCollegeName: item.scopeCollegeName,
                    scopeUniversityName: item.scopeUniversityName,
                    currentStageLabel: stage?.label ?? "Closed",
                    currentStageKind: stage?.kind ?? null,
                    availableDecisions,
                    permissions: {
                        canView,
                        canReview: Boolean(stage && stage.kind === "review" && canProcessStage),
                        canApprove: Boolean(stage && stage.kind === "final" && canProcessStage),
                        canReject: Boolean(stage && canProcessStage),
                    },
                };
            })
        )
    )
        .filter((record): record is NonNullable<typeof record> => Boolean(record))
        .sort(
            (left, right) =>
                new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime()
        );

    return {
        records,
        summary: {
            total: records.length,
            actionableCount: records.filter(
                (record) => record.permissions.canReview || record.permissions.canApprove
            ).length,
            pendingCount: records.filter((record) =>
                ["Submitted", "Board Review", "Under Review", "Committee Review"].includes(record.status)
            ).length,
            approvedCount: records.filter((record) => record.status === "Approved").length,
            rejectedCount: records.filter((record) => record.status === "Rejected").length,
        },
    };
}

export async function createCurriculumCalendar(actor: CurriculumActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumCalendarSchema.parse(rawInput);
    const calendar = await CurriculumAcademicCalendar.create({
        institutionId: ensureObjectId(input.institutionId, "Invalid institution."),
        academicYearId: ensureObjectId(input.academicYearId, "Invalid academic year."),
        title: input.title,
        startDate: toOptionalDate(input.startDate),
        endDate: toOptionalDate(input.endDate),
        status: input.status,
        createdBy: new Types.ObjectId(actor.id),
    });

    await createAuditEntry(actor, "CREATE", "academic_calendars", calendar._id.toString(), undefined, calendar);
    return calendar;
}

export async function updateCurriculumCalendar(actor: CurriculumActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumCalendarUpdateSchema.parse(rawInput);
    const calendar = await CurriculumAcademicCalendar.findById(id);
    if (!calendar) {
        throw new AuthError("Academic calendar was not found.", 404);
    }

    const oldData = calendar.toObject();
    if (input.institutionId) {
        calendar.institutionId = ensureObjectId(input.institutionId, "Invalid institution.");
    }
    if (input.academicYearId) {
        calendar.academicYearId = ensureObjectId(input.academicYearId, "Invalid academic year.");
    }
    if (input.title !== undefined) calendar.title = input.title;
    if (input.startDate !== undefined) calendar.startDate = toOptionalDate(input.startDate) ?? calendar.startDate;
    if (input.endDate !== undefined) calendar.endDate = toOptionalDate(input.endDate) ?? calendar.endDate;
    if (input.status !== undefined) calendar.status = input.status;
    await calendar.save();

    await createAuditEntry(actor, "UPDATE", "academic_calendars", calendar._id.toString(), oldData, calendar);
    return calendar;
}

export async function createCurriculumCalendarEvent(actor: CurriculumActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumCalendarEventSchema.parse(rawInput);
    const calendar = await CurriculumAcademicCalendar.findById(input.calendarId).select("_id");
    if (!calendar) {
        throw new AuthError("Selected calendar was not found.", 404);
    }

    const event = await CurriculumAcademicCalendarEvent.create({
        calendarId: calendar._id,
        eventTitle: input.eventTitle,
        eventType: input.eventType,
        startDate: toOptionalDate(input.startDate),
        endDate: toOptionalDate(input.endDate),
        description: input.description,
    });

    await createAuditEntry(actor, "CREATE", "academic_calendar_events", event._id.toString(), undefined, event);
    return event;
}

export async function updateCurriculumCalendarEvent(actor: CurriculumActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumCalendarEventUpdateSchema.parse(rawInput);
    const event = await CurriculumAcademicCalendarEvent.findById(id);
    if (!event) {
        throw new AuthError("Calendar event was not found.", 404);
    }

    const oldData = event.toObject();
    if (input.calendarId) {
        event.calendarId = ensureObjectId(input.calendarId, "Invalid calendar.");
    }
    if (input.eventTitle !== undefined) event.eventTitle = input.eventTitle;
    if (input.eventType !== undefined) event.eventType = input.eventType;
    if (input.startDate !== undefined) event.startDate = toOptionalDate(input.startDate) ?? event.startDate;
    if (input.endDate !== undefined) event.endDate = toOptionalDate(input.endDate);
    if (input.description !== undefined) event.description = input.description;
    await event.save();

    await createAuditEntry(actor, "UPDATE", "academic_calendar_events", event._id.toString(), oldData, event);
    return event;
}

export async function createCurriculumPlan(actor: CurriculumActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumPlanSchema.parse(rawInput);
    const { program, department, institution, scope } = await resolveProgramScope(input.programId);

    const plan = new CurriculumPlan({
        programId: program._id,
        institutionId: institution?._id,
        departmentId: department._id,
        effectiveFromAcademicYearId: toOptionalObjectId(input.effectiveFromAcademicYearId),
        title: input.title,
        regulationYear: input.regulationYear,
        totalCredits: input.totalCredits,
        status: input.status,
        summary: input.summary,
        createdBy: new Types.ObjectId(actor.id),
    });

    copyScopeToPlan(plan, scope);
    await plan.save();

    await createAuditEntry(actor, "CREATE", "curricula", plan._id.toString(), undefined, plan);
    return plan;
}

export async function updateCurriculumPlan(actor: CurriculumActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumPlanUpdateSchema.parse(rawInput);
    const plan = await CurriculumPlan.findById(id);
    if (!plan) {
        throw new AuthError("Curriculum plan was not found.", 404);
    }

    const oldData = plan.toObject();
    if (input.programId) {
        const { program, department, institution, scope } = await resolveProgramScope(input.programId);
        plan.programId = program._id;
        plan.departmentId = department._id;
        plan.institutionId = institution?._id;
        copyScopeToPlan(plan, scope);
    }
    if (input.effectiveFromAcademicYearId !== undefined) {
        plan.effectiveFromAcademicYearId = toOptionalObjectId(input.effectiveFromAcademicYearId);
    }
    if (input.title !== undefined) plan.title = input.title;
    if (input.regulationYear !== undefined) plan.regulationYear = input.regulationYear;
    if (input.totalCredits !== undefined) plan.totalCredits = input.totalCredits;
    if (input.status !== undefined) plan.status = input.status;
    if (input.summary !== undefined) plan.summary = input.summary;
    await plan.save();

    await createAuditEntry(actor, "UPDATE", "curricula", plan._id.toString(), oldData, plan);
    return plan;
}

export async function createCurriculumCourse(actor: CurriculumActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumCourseSchema.parse(rawInput);
    const planContext = await resolveCurriculumPlanContext(input.curriculumId);

    if (input.courseId) {
        const courseMaster = await Course.findById(input.courseId).select("programId");
        if (!courseMaster) {
            throw new AuthError("Selected master course was not found.", 404);
        }

        if (courseMaster.programId.toString() !== planContext.program._id.toString()) {
            throw new AuthError(
                "Selected master course does not belong to the curriculum program.",
                400
            );
        }
    }

    if (input.facultyOwnerUserId) {
        await ensureFacultyAssignee(input.facultyOwnerUserId, planContext);
    }

    const course = await CurriculumCourse.create({
        curriculumId: planContext.plan._id,
        courseId: toOptionalObjectId(input.courseId),
        courseCode: input.courseCode,
        courseTitle: input.courseTitle,
        courseType: input.courseType,
        credits: input.credits,
        lectureHours: input.lectureHours,
        tutorialHours: input.tutorialHours,
        practicalHours: input.practicalHours,
        semesterNumber: input.semesterNumber,
        displayOrder: input.displayOrder,
        facultyOwnerUserId: toOptionalObjectId(input.facultyOwnerUserId),
        isActive: input.isActive,
    });

    await createAuditEntry(actor, "CREATE", "curriculum_courses", course._id.toString(), undefined, course);
    return course;
}

export async function updateCurriculumCourse(actor: CurriculumActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumCourseUpdateSchema.parse(rawInput);
    const course = await CurriculumCourse.findById(id);
    if (!course) {
        throw new AuthError("Curriculum course was not found.", 404);
    }

    const oldData = course.toObject();
    const planContext = await resolveCurriculumPlanContext(
        (input.curriculumId ?? course.curriculumId.toString()) as string
    );

    if (input.curriculumId) {
        course.curriculumId = ensureObjectId(input.curriculumId, "Invalid curriculum plan.");
    }
    if (input.courseId !== undefined) {
        course.courseId = toOptionalObjectId(input.courseId);
    }
    if (input.courseCode !== undefined) course.courseCode = input.courseCode;
    if (input.courseTitle !== undefined) course.courseTitle = input.courseTitle;
    if (input.courseType !== undefined) course.courseType = input.courseType;
    if (input.credits !== undefined) course.credits = input.credits;
    if (input.lectureHours !== undefined) course.lectureHours = input.lectureHours;
    if (input.tutorialHours !== undefined) course.tutorialHours = input.tutorialHours;
    if (input.practicalHours !== undefined) course.practicalHours = input.practicalHours;
    if (input.semesterNumber !== undefined) course.semesterNumber = input.semesterNumber;
    if (input.displayOrder !== undefined) course.displayOrder = input.displayOrder;
    if (input.isActive !== undefined) course.isActive = input.isActive;
    if (input.facultyOwnerUserId !== undefined) {
        if (input.facultyOwnerUserId) {
            await ensureFacultyAssignee(input.facultyOwnerUserId, planContext);
        }
        course.facultyOwnerUserId = toOptionalObjectId(input.facultyOwnerUserId);
    }
    await course.save();

    await createAuditEntry(actor, "UPDATE", "curriculum_courses", course._id.toString(), oldData, course);
    return course;
}

export async function createCurriculumSyllabusVersion(actor: CurriculumActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumSyllabusVersionSchema.parse(rawInput);
    const [plan, course] = await Promise.all([
        CurriculumPlan.findById(input.curriculumId).select("_id status"),
        CurriculumCourse.findById(input.curriculumCourseId).select("_id curriculumId"),
    ]);

    if (!plan || !course || course.curriculumId.toString() !== plan._id.toString()) {
        throw new AuthError("Selected curriculum course does not belong to the curriculum plan.", 400);
    }

    const version = await CurriculumSyllabusVersion.create({
        curriculumId: plan._id,
        curriculumCourseId: course._id,
        versionNumber: input.versionNumber,
        revisionReason: input.revisionReason,
        syllabusSummary: input.syllabusSummary,
        unitOutline: input.unitOutline,
        pedagogy: input.pedagogy,
        assessmentStrategy: input.assessmentStrategy,
        referenceBooks: toReferenceBookList(input.referenceBooks),
        officialDocumentId: toOptionalObjectId(input.officialDocumentId),
        approvedByBosMeetingId: toOptionalObjectId(input.approvedByBosMeetingId),
        effectiveAcademicYearId: toOptionalObjectId(input.effectiveAcademicYearId),
        preparedByUserId: new Types.ObjectId(actor.id),
        lastEditedByUserId: new Types.ObjectId(actor.id),
        status: "Draft",
    });

    await createAuditEntry(actor, "CREATE", "syllabus_versions", version._id.toString(), undefined, version);
    return version;
}

export async function updateCurriculumSyllabusVersion(actor: CurriculumActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumSyllabusVersionUpdateSchema.parse(rawInput);
    if ("status" in (rawInput as Record<string, unknown>)) {
        throw new AuthError("Syllabus workflow status must be updated through governed actions.", 400);
    }

    const version = await CurriculumSyllabusVersion.findById(id);
    if (!version) {
        throw new AuthError("Syllabus version was not found.", 404);
    }

    const oldData = version.toObject();
    if (input.curriculumId) version.curriculumId = ensureObjectId(input.curriculumId, "Invalid curriculum plan.");
    if (input.curriculumCourseId) {
        version.curriculumCourseId = ensureObjectId(input.curriculumCourseId, "Invalid curriculum course.");
    }
    if (input.versionNumber !== undefined) version.versionNumber = input.versionNumber;
    if (input.revisionReason !== undefined) version.revisionReason = input.revisionReason;
    if (input.syllabusSummary !== undefined) version.syllabusSummary = input.syllabusSummary;
    if (input.unitOutline !== undefined) version.unitOutline = input.unitOutline;
    if (input.pedagogy !== undefined) version.pedagogy = input.pedagogy;
    if (input.assessmentStrategy !== undefined) version.assessmentStrategy = input.assessmentStrategy;
    if (input.referenceBooks !== undefined) version.referenceBooks = toReferenceBookList(input.referenceBooks);
    if (input.officialDocumentId !== undefined) {
        version.officialDocumentId = toOptionalObjectId(input.officialDocumentId);
    }
    if (input.approvedByBosMeetingId !== undefined) {
        version.approvedByBosMeetingId = toOptionalObjectId(input.approvedByBosMeetingId);
    }
    if (input.effectiveAcademicYearId !== undefined) {
        version.effectiveAcademicYearId = toOptionalObjectId(input.effectiveAcademicYearId);
    }
    version.lastEditedByUserId = new Types.ObjectId(actor.id);
    await version.save();

    await createAuditEntry(actor, "UPDATE", "syllabus_versions", version._id.toString(), oldData, version);
    return version;
}

export async function createCurriculumProgramOutcome(actor: CurriculumActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumProgramOutcomeSchema.parse(rawInput);
    const plan = await CurriculumPlan.findById(input.curriculumId).select("_id programId");
    if (!plan || plan.programId.toString() !== input.programId) {
        throw new AuthError("Program outcome must belong to the selected curriculum plan.", 400);
    }

    const outcome = await CurriculumProgramOutcome.create({
        curriculumId: plan._id,
        programId: ensureObjectId(input.programId, "Invalid program."),
        outcomeType: input.outcomeType,
        outcomeCode: input.outcomeCode,
        description: input.description,
        isActive: input.isActive,
    });

    await createAuditEntry(actor, "CREATE", "curriculum_program_outcomes", outcome._id.toString(), undefined, outcome);
    return outcome;
}

export async function updateCurriculumProgramOutcome(actor: CurriculumActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumProgramOutcomeUpdateSchema.parse(rawInput);
    const outcome = await CurriculumProgramOutcome.findById(id);
    if (!outcome) {
        throw new AuthError("Program outcome was not found.", 404);
    }

    const oldData = outcome.toObject();
    if (input.curriculumId) outcome.curriculumId = ensureObjectId(input.curriculumId, "Invalid curriculum plan.");
    if (input.programId) outcome.programId = ensureObjectId(input.programId, "Invalid program.");
    if (input.outcomeType !== undefined) outcome.outcomeType = input.outcomeType;
    if (input.outcomeCode !== undefined) outcome.outcomeCode = input.outcomeCode;
    if (input.description !== undefined) outcome.description = input.description;
    if (input.isActive !== undefined) outcome.isActive = input.isActive;
    await outcome.save();

    await createAuditEntry(actor, "UPDATE", "curriculum_program_outcomes", outcome._id.toString(), oldData, outcome);
    return outcome;
}

export async function createCurriculumBosMeeting(actor: CurriculumActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumBosMeetingSchema.parse(rawInput);
    const meeting = await CurriculumBosMeeting.create({
        departmentId: ensureObjectId(input.departmentId, "Invalid department."),
        academicYearId: toOptionalObjectId(input.academicYearId),
        title: input.title,
        meetingDate: toOptionalDate(input.meetingDate),
        agenda: input.agenda,
        minutesDocumentId: toOptionalObjectId(input.minutesDocumentId),
        createdBy: new Types.ObjectId(actor.id),
    });

    await createAuditEntry(actor, "CREATE", "bos_meetings", meeting._id.toString(), undefined, meeting);
    return meeting;
}

export async function updateCurriculumBosMeeting(actor: CurriculumActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumBosMeetingUpdateSchema.parse(rawInput);
    const meeting = await CurriculumBosMeeting.findById(id);
    if (!meeting) {
        throw new AuthError("BoS meeting was not found.", 404);
    }

    const oldData = meeting.toObject();
    if (input.departmentId) meeting.departmentId = ensureObjectId(input.departmentId, "Invalid department.");
    if (input.academicYearId !== undefined) meeting.academicYearId = toOptionalObjectId(input.academicYearId);
    if (input.title !== undefined) meeting.title = input.title;
    if (input.meetingDate !== undefined) meeting.meetingDate = toOptionalDate(input.meetingDate) ?? meeting.meetingDate;
    if (input.agenda !== undefined) meeting.agenda = input.agenda;
    if (input.minutesDocumentId !== undefined) {
        meeting.minutesDocumentId = toOptionalObjectId(input.minutesDocumentId);
    }
    await meeting.save();

    await createAuditEntry(actor, "UPDATE", "bos_meetings", meeting._id.toString(), oldData, meeting);
    return meeting;
}

export async function createCurriculumBosDecision(actor: CurriculumActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumBosDecisionSchema.parse(rawInput);
    const decision = await CurriculumBosDecision.create({
        meetingId: ensureObjectId(input.meetingId, "Invalid meeting."),
        curriculumId: toOptionalObjectId(input.curriculumId),
        curriculumCourseId: toOptionalObjectId(input.curriculumCourseId),
        decisionTitle: input.decisionTitle,
        decisionType: input.decisionType,
        description: input.description,
        status: input.status,
        implementedAcademicYearId: toOptionalObjectId(input.implementedAcademicYearId),
    });

    await createAuditEntry(actor, "CREATE", "bos_decisions", decision._id.toString(), undefined, decision);
    return decision;
}

export async function updateCurriculumBosDecision(actor: CurriculumActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumBosDecisionUpdateSchema.parse(rawInput);
    const decision = await CurriculumBosDecision.findById(id);
    if (!decision) {
        throw new AuthError("BoS decision was not found.", 404);
    }

    const oldData = decision.toObject();
    if (input.meetingId) decision.meetingId = ensureObjectId(input.meetingId, "Invalid meeting.");
    if (input.curriculumId !== undefined) decision.curriculumId = toOptionalObjectId(input.curriculumId);
    if (input.curriculumCourseId !== undefined) {
        decision.curriculumCourseId = toOptionalObjectId(input.curriculumCourseId);
    }
    if (input.decisionTitle !== undefined) decision.decisionTitle = input.decisionTitle;
    if (input.decisionType !== undefined) decision.decisionType = input.decisionType;
    if (input.description !== undefined) decision.description = input.description;
    if (input.status !== undefined) decision.status = input.status;
    if (input.implementedAcademicYearId !== undefined) {
        decision.implementedAcademicYearId = toOptionalObjectId(input.implementedAcademicYearId);
    }
    await decision.save();

    await createAuditEntry(actor, "UPDATE", "bos_decisions", decision._id.toString(), oldData, decision);
    return decision;
}

export async function createCurriculumValueAddedCourse(actor: CurriculumActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumValueAddedCourseSchema.parse(rawInput);
    const record = await CurriculumValueAddedCourse.create({
        departmentId: ensureObjectId(input.departmentId, "Invalid department."),
        academicYearId: toOptionalObjectId(input.academicYearId),
        title: input.title,
        courseCode: input.courseCode,
        credits: input.credits,
        contactHours: input.contactHours,
        coordinatorUserId: toOptionalObjectId(input.coordinatorUserId),
        startDate: toOptionalDate(input.startDate),
        endDate: toOptionalDate(input.endDate),
        status: input.status,
        description: input.description,
        documentId: toOptionalObjectId(input.documentId),
    });

    await createAuditEntry(actor, "CREATE", "value_added_courses", record._id.toString(), undefined, record);
    return record;
}

export async function updateCurriculumValueAddedCourse(actor: CurriculumActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumValueAddedCourseUpdateSchema.parse(rawInput);
    const record = await CurriculumValueAddedCourse.findById(id);
    if (!record) {
        throw new AuthError("Value added course was not found.", 404);
    }

    const oldData = record.toObject();
    if (input.departmentId) record.departmentId = ensureObjectId(input.departmentId, "Invalid department.");
    if (input.academicYearId !== undefined) record.academicYearId = toOptionalObjectId(input.academicYearId);
    if (input.title !== undefined) record.title = input.title;
    if (input.courseCode !== undefined) record.courseCode = input.courseCode;
    if (input.credits !== undefined) record.credits = input.credits;
    if (input.contactHours !== undefined) record.contactHours = input.contactHours;
    if (input.coordinatorUserId !== undefined) {
        record.coordinatorUserId = toOptionalObjectId(input.coordinatorUserId);
    }
    if (input.startDate !== undefined) record.startDate = toOptionalDate(input.startDate);
    if (input.endDate !== undefined) record.endDate = toOptionalDate(input.endDate);
    if (input.status !== undefined) record.status = input.status;
    if (input.description !== undefined) record.description = input.description;
    if (input.documentId !== undefined) record.documentId = toOptionalObjectId(input.documentId);
    await record.save();

    await createAuditEntry(actor, "UPDATE", "value_added_courses", record._id.toString(), oldData, record);
    return record;
}

export async function createCurriculumAssignment(actor: CurriculumActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumAssignmentSchema.parse(rawInput);
    const planContext = await resolveCurriculumPlanContext(input.curriculumId);
    const [course, syllabusVersion, assignee] = await Promise.all([
        CurriculumCourse.findById(input.curriculumCourseId),
        CurriculumSyllabusVersion.findById(input.syllabusVersionId),
        ensureFacultyAssignee(input.assigneeUserId, planContext),
    ]);

    if (!course || course.curriculumId.toString() !== planContext.plan._id.toString()) {
        throw new AuthError("Selected curriculum course does not belong to the curriculum plan.", 400);
    }

    if (
        !syllabusVersion ||
        syllabusVersion.curriculumId.toString() !== planContext.plan._id.toString() ||
        syllabusVersion.curriculumCourseId.toString() !== course._id.toString()
    ) {
        throw new AuthError("Selected syllabus version does not belong to the curriculum course.", 400);
    }

    const assignment = new CurriculumAssignment({
        curriculumId: planContext.plan._id,
        curriculumCourseId: course._id,
        syllabusVersionId: syllabusVersion._id,
        assigneeUserId: assignee._id,
        assignedBy: new Types.ObjectId(actor.id),
        assigneeRole: assignee.role,
        dueDate: toOptionalDate(input.dueDate),
        notes: input.notes,
        status: "Draft",
        isActive: input.isActive,
    });
    copyScopeToAssignment(assignment, planContext.scope);
    pushStatusLog(assignment, "Draft", actor, "Curriculum assignment created.");
    await assignment.save();

    course.facultyOwnerUserId = assignee._id;
    await course.save();

    await syncWorkflowInstanceState({
        moduleName: "CURRICULUM",
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
        remarks: "Curriculum assignment initialized.",
        action: "submit",
    });

    await createAuditEntry(actor, "CREATE", "curriculum_assignments", assignment._id.toString(), undefined, assignment);
    return assignment;
}

export async function updateCurriculumAssignment(actor: CurriculumActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = curriculumAssignmentUpdateSchema.parse(rawInput);
    if ("status" in (rawInput as Record<string, unknown>)) {
        throw new AuthError("Assignment workflow status must be updated through governed actions.", 400);
    }

    const { assignment } = await loadAssignmentCore(id);
    const oldData = assignment.toObject();

    if (input.curriculumId) assignment.curriculumId = ensureObjectId(input.curriculumId, "Invalid curriculum plan.");
    if (input.curriculumCourseId) {
        assignment.curriculumCourseId = ensureObjectId(input.curriculumCourseId, "Invalid curriculum course.");
    }
    if (input.syllabusVersionId) {
        assignment.syllabusVersionId = ensureObjectId(input.syllabusVersionId, "Invalid syllabus version.");
    }
    if (input.assigneeUserId) {
        const planContext = await resolveCurriculumPlanContext(assignment.curriculumId.toString());
        const assignee = await ensureFacultyAssignee(input.assigneeUserId, planContext);
        assignment.assigneeUserId = assignee._id;
        assignment.assigneeRole = assignee.role;
    }
    if (input.dueDate !== undefined) assignment.dueDate = toOptionalDate(input.dueDate);
    if (input.notes !== undefined) assignment.notes = input.notes;
    if (input.isActive !== undefined) assignment.isActive = input.isActive;
    await assignment.save();

    await createAuditEntry(actor, "UPDATE", "curriculum_assignments", assignment._id.toString(), oldData, assignment);
    return assignment;
}

export async function saveCurriculumContributionDraft(
    actor: CurriculumActor,
    assignmentId: string,
    rawInput: unknown
) {
    await dbConnect();

    const input = curriculumContributionDraftSchema.parse(rawInput);
    const { assignment, plan, syllabusVersion } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() !== actor.id) {
        throw new AuthError("This curriculum assignment is not mapped to your account.", 403);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or rejected curriculum assignments can be edited.", 400);
    }

    if (plan.status === "Archived") {
        throw new AuthError("Archived curriculum plans are read-only.", 400);
    }

    const oldAssignment = assignment.toObject();
    const oldVersion = syllabusVersion.toObject();

    syllabusVersion.revisionReason = input.revisionReason;
    syllabusVersion.syllabusSummary = input.syllabusSummary;
    syllabusVersion.unitOutline = input.unitOutline;
    syllabusVersion.pedagogy = input.pedagogy;
    syllabusVersion.assessmentStrategy = input.assessmentStrategy;
    syllabusVersion.referenceBooks = toReferenceBookList(input.referenceBooks);
    syllabusVersion.officialDocumentId = toOptionalObjectId(input.officialDocumentId);
    syllabusVersion.approvedByBosMeetingId = toOptionalObjectId(input.approvedByBosMeetingId);
    syllabusVersion.effectiveAcademicYearId = toOptionalObjectId(input.effectiveAcademicYearId);
    syllabusVersion.lastEditedByUserId = new Types.ObjectId(actor.id);
    await syllabusVersion.save();

    await CurriculumCourseOutcome.deleteMany({ syllabusVersionId: syllabusVersion._id });
    const createdOutcomes = await CurriculumCourseOutcome.insertMany(
        input.outcomes.map((outcome, index) => ({
            curriculumId: assignment.curriculumId,
            curriculumCourseId: assignment.curriculumCourseId,
            syllabusVersionId: syllabusVersion._id,
            coCode: outcome.coCode,
            description: outcome.description,
            bloomLevel: outcome.bloomLevel,
            targetAttainmentPercentage: outcome.targetAttainmentPercentage,
            displayOrder: index + 1,
            isActive: true,
        }))
    );

    await CurriculumOutcomeMapping.deleteMany({ syllabusVersionId: syllabusVersion._id });
    const programOutcomes = await CurriculumProgramOutcome.find({
        curriculumId: assignment.curriculumId,
        isActive: true,
    }).lean();
    const programOutcomeIdByCode = new Map(
        programOutcomes.map((outcome) => [String(outcome.outcomeCode).toUpperCase(), outcome._id.toString()])
    );
    const courseOutcomeIdByCode = new Map(
        createdOutcomes.map((outcome) => [String(outcome.coCode).toUpperCase(), outcome._id.toString()])
    );

    const mappingPayload = input.mappings.map((mapping) => {
        const courseOutcomeId = courseOutcomeIdByCode.get(mapping.courseOutcomeCode.toUpperCase());
        const programOutcomeId =
            mapping.programOutcomeId ||
            (mapping.programOutcomeCode
                ? programOutcomeIdByCode.get(mapping.programOutcomeCode.toUpperCase())
                : undefined);

        if (!courseOutcomeId) {
            throw new AuthError(
                `Mapped course outcome "${mapping.courseOutcomeCode}" does not exist in this draft.`,
                400
            );
        }

        if (!programOutcomeId) {
            throw new AuthError(
                `Mapped program outcome "${mapping.programOutcomeCode ?? mapping.programOutcomeId}" was not found.`,
                400
            );
        }

        return {
            curriculumId: assignment.curriculumId,
            curriculumCourseId: assignment.curriculumCourseId,
            syllabusVersionId: syllabusVersion._id,
            courseOutcomeId: new Types.ObjectId(courseOutcomeId),
            programOutcomeId: new Types.ObjectId(programOutcomeId),
            mappingStrength: mapping.mappingStrength,
        };
    });

    if (mappingPayload.length) {
        await CurriculumOutcomeMapping.insertMany(mappingPayload);
    }

    assignment.supportingLinks = input.supportingLinks;
    assignment.documentIds = toObjectIdList(input.documentIds);
    assignment.contributorRemarks = input.contributorRemarks;
    await assignment.save();

    await createAuditEntry(actor, "UPDATE", "syllabus_versions", syllabusVersion._id.toString(), oldVersion, syllabusVersion);
    await createAuditEntry(actor, "UPDATE", "curriculum_assignments", assignment._id.toString(), oldAssignment, assignment);

    return {
        assignment,
        syllabusVersion,
    };
}

export async function submitCurriculumAssignment(actor: CurriculumActor, assignmentId: string) {
    await dbConnect();

    const { assignment, plan, syllabusVersion } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() !== actor.id) {
        throw new AuthError("This curriculum assignment is not mapped to your account.", 403);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or rejected curriculum assignments can be submitted.", 400);
    }

    if (plan.status !== "Active") {
        throw new AuthError("The curriculum plan must be active before contributions can be submitted.", 400);
    }

    const [courseOutcomes, mappings] = await Promise.all([
        CurriculumCourseOutcome.find({
            syllabusVersionId: syllabusVersion._id,
            isActive: true,
        }).lean(),
        CurriculumOutcomeMapping.find({ syllabusVersionId: syllabusVersion._id }).lean(),
    ]);

    if (!syllabusVersion.syllabusSummary?.trim()) {
        throw new AuthError("Syllabus summary is required before submission.", 400);
    }

    if (!syllabusVersion.unitOutline?.trim()) {
        throw new AuthError("Unit outline is required before submission.", 400);
    }

    if (!courseOutcomes.length) {
        throw new AuthError("At least one course outcome is required before submission.", 400);
    }

    if (!mappings.length) {
        throw new AuthError("At least one CO-PO/PSO mapping is required before submission.", 400);
    }

    if (!syllabusVersion.officialDocumentId && !assignment.documentIds.length) {
        throw new AuthError("Attach the syllabus document or supporting evidence before submission.", 400);
    }

    const transition = resolveWorkflowTransition(
        await getActiveWorkflowDefinition("CURRICULUM"),
        assignment.status,
        "submit"
    );

    assignment.status = transition.status as CurriculumWorkflowStatus;
    assignment.submittedAt = new Date();
    assignment.reviewedAt = undefined;
    assignment.approvedAt = undefined;
    assignment.approvedBy = undefined;
    assignment.reviewRemarks = undefined;
    pushStatusLog(assignment, assignment.status, actor, "Curriculum contribution submitted.");
    await assignment.save();

    syllabusVersion.status = assignment.status;
    syllabusVersion.submittedAt = assignment.submittedAt;
    syllabusVersion.reviewedAt = undefined;
    syllabusVersion.approvedAt = undefined;
    syllabusVersion.approvedBy = undefined;
    syllabusVersion.lastEditedByUserId = new Types.ObjectId(actor.id);
    await syllabusVersion.save();

    await syncWorkflowInstanceState({
        moduleName: "CURRICULUM",
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
        remarks: "Curriculum contribution submitted.",
        action: "submit",
    });

    await createAuditEntry(actor, "SUBMIT", "curriculum_assignments", assignment._id.toString(), undefined, assignment);
    return assignment;
}

export async function reviewCurriculumAssignment(
    actor: CurriculumActor,
    assignmentId: string,
    rawInput: unknown
) {
    await dbConnect();

    const input = curriculumReviewSchema.parse(rawInput);
    const { assignment, syllabusVersion } = await loadAssignmentCore(assignmentId);

    if (assignment.assigneeUserId.toString() === actor.id && actor.role !== "Admin") {
        throw new AuthError("Contributors cannot review their own curriculum assignment.", 403);
    }

    const workflowDefinition = await getActiveWorkflowDefinition("CURRICULUM");
    const stage = getWorkflowStageByStatus(workflowDefinition, assignment.status);

    if (!stage) {
        throw new AuthError("This curriculum assignment is not awaiting workflow action.", 400);
    }

    const canProcess = await canActorProcessWorkflowStage({
        actor,
        moduleName: "CURRICULUM",
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
        stageKinds: [stage.kind],
    });

    if (!canProcess) {
        throw new AuthError("You are not authorized to review this curriculum assignment.", 403);
    }

    const action = input.decision === "Reject" ? "reject" : "approve";
    const transition = resolveWorkflowTransition(workflowDefinition, assignment.status, action);
    assignment.status = transition.status as CurriculumWorkflowStatus;
    assignment.reviewRemarks = input.remarks;
    assignment.reviewedAt = new Date();
    assignment.reviewHistory.push({
        reviewerId: new Types.ObjectId(actor.id),
        reviewerName: actor.name,
        reviewerRole: actor.role,
        stage: stage.label,
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

    syllabusVersion.status = assignment.status;
    syllabusVersion.reviewedAt = assignment.reviewedAt;
    syllabusVersion.approvedAt = assignment.approvedAt;
    syllabusVersion.approvedBy = assignment.approvedBy;
    syllabusVersion.lastEditedByUserId = new Types.ObjectId(actor.id);
    await syllabusVersion.save();

    await syncWorkflowInstanceState({
        moduleName: "CURRICULUM",
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

    await createAuditEntry(actor, "REVIEW", "curriculum_assignments", assignment._id.toString(), undefined, assignment);
    return assignment;
}
