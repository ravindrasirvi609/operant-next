import { Types } from "mongoose";

import { formatAcademicYearLabel } from "@/lib/academic-year";
import { createAuditLog, type AuditRequestContext } from "@/lib/audit/service";
import {
    canActorProcessWorkflowStage,
    getActiveWorkflowDefinition,
    getWorkflowStageByStatus,
    resolveWorkflowTransition,
    syncWorkflowInstanceState,
} from "@/lib/workflow/engine";
import {
    buildAuthorizedScopeQuery,
    canListModuleRecords,
    canViewModuleRecord,
    resolveAuthorizationProfile,
    resolveFacultyAuthorizationScope,
} from "@/lib/authorization/service";
import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import Department from "@/models/reference/department";
import Institution from "@/models/reference/institution";
import AcademicYear from "@/models/reference/academic-year";
import Student from "@/models/student/student";
import User from "@/models/core/user";
import DocumentModel from "@/models/reference/document";
import SsrCycle from "@/models/reporting/ssr-cycle";
import SsrCriterion from "@/models/reporting/ssr-criterion";
import SsrMetric from "@/models/reporting/ssr-metric";
import SsrNarrativeSection from "@/models/reporting/ssr-narrative-section";
import SsrAssignment, { type SsrWorkflowStatus } from "@/models/reporting/ssr-assignment";
import SsrMetricResponse, {
    type ISsrMetricResponse,
} from "@/models/reporting/ssr-metric-response";
import {
    ssrAssignmentSchema,
    ssrAssignmentUpdateSchema,
    ssrCriterionSchema,
    ssrCriterionUpdateSchema,
    ssrCycleSchema,
    ssrCycleUpdateSchema,
    ssrMetricSchema,
    ssrMetricUpdateSchema,
    ssrNarrativeSectionSchema,
    ssrNarrativeSectionUpdateSchema,
    ssrResponseDraftSchema,
    ssrReviewSchema,
} from "@/lib/ssr/validators";

type SsrActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
    collegeName?: string;
    universityName?: string;
    auditContext?: AuditRequestContext;
};

type SubjectScope = {
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

type SsrScopeSnapshot = {
    scopeDepartmentName?: string;
    scopeCollegeName?: string;
    scopeUniversityName?: string;
    scopeDepartmentId?: Types.ObjectId;
    scopeInstitutionId?: Types.ObjectId;
    scopeDepartmentOrganizationId?: Types.ObjectId;
    scopeCollegeOrganizationId?: Types.ObjectId;
    scopeUniversityOrganizationId?: Types.ObjectId;
    scopeOrganizationIds: Types.ObjectId[];
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

function countWords(value?: string | null) {
    const text = String(value ?? "").trim();
    if (!text) {
        return 0;
    }

    return text.split(/\s+/).length;
}

function formatMetricValueSummary(
    dataType: string,
    response: Pick<
        ISsrMetricResponse,
        | "narrativeResponse"
        | "metricValueNumeric"
        | "metricValueText"
        | "metricValueBoolean"
        | "metricValueDate"
        | "tableData"
    >
) {
    const value = getMetricInputValue(dataType, response);

    if (value === undefined || value === null || value === "") {
        return "No response captured";
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === "boolean") {
        return value ? "Yes" : "No";
    }

    if (typeof value === "number") {
        return String(value);
    }

    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch {
            return "Structured response";
        }
    }

    return String(value);
}

function getMetricInputValue(
    dataType: string,
    response: Pick<
        ISsrMetricResponse,
        | "narrativeResponse"
        | "metricValueNumeric"
        | "metricValueText"
        | "metricValueBoolean"
        | "metricValueDate"
        | "tableData"
    >
) {
    switch (dataType) {
        case "Narrative":
            return response.narrativeResponse;
        case "Number":
        case "Percentage":
        case "Currency":
            return response.metricValueNumeric;
        case "Boolean":
            return response.metricValueBoolean;
        case "Date":
            return response.metricValueDate;
        case "Text":
            return response.metricValueText ?? response.narrativeResponse;
        case "Json":
            return response.tableData && Object.keys(response.tableData).length
                ? response.tableData
                : undefined;
        default:
            return response.metricValueText ?? response.narrativeResponse;
    }
}

function pushStatusLog(
    response: InstanceType<typeof SsrMetricResponse>,
    status: SsrWorkflowStatus,
    actor?: SsrActor,
    remarks?: string
) {
    response.statusLogs.push({
        status,
        actorId: actor?.id ? new Types.ObjectId(actor.id) : undefined,
        actorName: actor?.name,
        actorRole: actor?.role,
        remarks,
        changedAt: new Date(),
    });
}

function toScopeSnapshot(scope: SubjectScope): SsrScopeSnapshot {
    return {
        scopeDepartmentName: scope.departmentName,
        scopeCollegeName: scope.collegeName,
        scopeUniversityName: scope.universityName,
        scopeDepartmentId:
            scope.departmentId && Types.ObjectId.isValid(scope.departmentId)
                ? new Types.ObjectId(scope.departmentId)
                : undefined,
        scopeInstitutionId:
            scope.institutionId && Types.ObjectId.isValid(scope.institutionId)
                ? new Types.ObjectId(scope.institutionId)
                : undefined,
        scopeDepartmentOrganizationId:
            scope.departmentOrganizationId && Types.ObjectId.isValid(scope.departmentOrganizationId)
                ? new Types.ObjectId(scope.departmentOrganizationId)
                : undefined,
        scopeCollegeOrganizationId:
            scope.collegeOrganizationId && Types.ObjectId.isValid(scope.collegeOrganizationId)
                ? new Types.ObjectId(scope.collegeOrganizationId)
                : undefined,
        scopeUniversityOrganizationId:
            scope.universityOrganizationId && Types.ObjectId.isValid(scope.universityOrganizationId)
                ? new Types.ObjectId(scope.universityOrganizationId)
                : undefined,
        scopeOrganizationIds: toObjectIdList(scope.subjectOrganizationIds),
    };
}

function copyScopeToResponse(
    response: InstanceType<typeof SsrMetricResponse>,
    assignment: InstanceType<typeof SsrAssignment>
) {
    response.scopeDepartmentName = assignment.scopeDepartmentName;
    response.scopeCollegeName = assignment.scopeCollegeName;
    response.scopeUniversityName = assignment.scopeUniversityName;
    response.scopeDepartmentId = assignment.scopeDepartmentId;
    response.scopeInstitutionId = assignment.scopeInstitutionId;
    response.scopeDepartmentOrganizationId = assignment.scopeDepartmentOrganizationId;
    response.scopeCollegeOrganizationId = assignment.scopeCollegeOrganizationId;
    response.scopeUniversityOrganizationId = assignment.scopeUniversityOrganizationId;
    response.scopeOrganizationIds = assignment.scopeOrganizationIds ?? [];
}

async function assertAdmin(actor: SsrActor) {
    if (actor.role !== "Admin") {
        throw new AuthError("Admin access is required.", 403);
    }
}

async function getUserSnapshot(userId: string) {
    const user = await User.findById(userId).select(
        "name email role department collegeName universityName departmentId institutionId facultyId studentId isActive accountStatus emailVerified"
    );

    if (!user) {
        throw new AuthError("Selected user was not found.", 404);
    }

    if (!user.isActive || user.accountStatus !== "Active" || !user.emailVerified) {
        throw new AuthError("Selected user is not an active verified account.", 400);
    }

    return user;
}

async function resolveStudentSubjectScope(studentId: string): Promise<SubjectScope> {
    const student = await Student.findById(studentId).select("departmentId institutionId");
    if (!student) {
        throw new AuthError("Student record not found.", 404);
    }

    const [department, institution] = await Promise.all([
        student.departmentId
            ? Department.findById(student.departmentId).select("_id name organizationId institutionId")
            : null,
        student.institutionId
            ? Institution.findById(student.institutionId).select("_id name organizationId")
            : null,
    ]);

    return {
        departmentName: department?.name,
        collegeName: undefined,
        universityName: institution?.name,
        departmentId: department?._id?.toString(),
        institutionId: institution?._id?.toString(),
        departmentOrganizationId: department?.organizationId?.toString(),
        universityOrganizationId: institution?.organizationId?.toString(),
        subjectOrganizationIds: uniqueStrings([
            department?.organizationId?.toString(),
            institution?.organizationId?.toString(),
        ]),
    };
}

async function resolveUserSubjectScope(user: Awaited<ReturnType<typeof getUserSnapshot>>) {
    if (user.role === "Faculty" && user.facultyId) {
        return resolveFacultyAuthorizationScope(user.facultyId.toString());
    }

    if (user.role === "Student" && user.studentId) {
        return resolveStudentSubjectScope(user.studentId.toString());
    }

    return {
        departmentName: user.department,
        collegeName: user.collegeName,
        universityName: user.universityName,
        departmentId: user.departmentId?.toString(),
        institutionId: user.institutionId?.toString(),
        subjectOrganizationIds: uniqueStrings([
            user.departmentId?.toString(),
            user.institutionId?.toString(),
        ]),
    };
}

async function resolveCycleReferences(cycleId?: string, academicYearId?: string, institutionId?: string) {
    if (cycleId) {
        ensureObjectId(cycleId, "Invalid cycle identifier.");
    }

    if (academicYearId) {
        ensureObjectId(academicYearId, "Invalid academic year identifier.");
    }

    if (institutionId) {
        ensureObjectId(institutionId, "Invalid institution identifier.");
    }
}

async function ensureCycleHierarchy(options: {
    cycleId: string;
    criterionId: string;
    metricId: string;
    sectionId?: string;
}) {
    const [cycle, criterion, metric, section] = await Promise.all([
        SsrCycle.findById(options.cycleId),
        SsrCriterion.findById(options.criterionId),
        SsrMetric.findById(options.metricId),
        options.sectionId ? SsrNarrativeSection.findById(options.sectionId) : null,
    ]);

    if (!cycle) {
        throw new AuthError("SSR cycle not found.", 404);
    }

    if (!criterion || criterion.cycleId.toString() !== cycle._id.toString()) {
        throw new AuthError("Selected criterion does not belong to the selected cycle.", 400);
    }

    if (
        !metric ||
        metric.cycleId.toString() !== cycle._id.toString() ||
        metric.criterionId.toString() !== criterion._id.toString()
    ) {
        throw new AuthError("Selected metric does not belong to the chosen criterion.", 400);
    }

    if (
        section &&
        (section.cycleId.toString() !== cycle._id.toString() ||
            section.criterionId.toString() !== criterion._id.toString() ||
            section.metricId.toString() !== metric._id.toString())
    ) {
        throw new AuthError("Selected narrative section does not belong to the chosen metric.", 400);
    }

    return { cycle, criterion, metric, section };
}

async function getAssignmentForActor(actor: SsrActor, assignmentId: string) {
    await dbConnect();

    const assignment = await SsrAssignment.findById(assignmentId);
    if (!assignment) {
        throw new AuthError("SSR assignment not found.", 404);
    }

    const isOwner = assignment.assigneeUserId.toString() === actor.id;
    if (!isOwner && actor.role !== "Admin") {
        throw new AuthError("You are not authorized to access this SSR assignment.", 403);
    }

    return assignment;
}

async function validateDocumentIds(documentIds: string[]) {
    if (!documentIds.length) {
        return;
    }

    const count = await DocumentModel.countDocuments({
        _id: { $in: documentIds.map((value) => new Types.ObjectId(value)) },
    });

    if (count !== documentIds.length) {
        throw new AuthError("One or more supporting document references are invalid.", 400);
    }
}

function validateResponseForSubmission(options: {
    metric: { dataType: string; evidenceMode: string };
    section?: { wordLimitMin?: number; wordLimitMax?: number } | null;
    response: Pick<
        ISsrMetricResponse,
        | "narrativeResponse"
        | "metricValueNumeric"
        | "metricValueText"
        | "metricValueBoolean"
        | "metricValueDate"
        | "tableData"
        | "documentIds"
        | "supportingLinks"
    >;
}) {
    const metricValue = getMetricInputValue(options.metric.dataType, options.response);

    if (
        metricValue === undefined ||
        metricValue === null ||
        metricValue === "" ||
        (typeof metricValue === "number" && Number.isNaN(metricValue))
    ) {
        throw new AuthError("Complete the required SSR metric response before submission.", 400);
    }

    if (options.section) {
        const narrative = String(options.response.narrativeResponse ?? "").trim();
        if (!narrative) {
            throw new AuthError("Complete the required SSR narrative section before submission.", 400);
        }

        const words = countWords(narrative);
        if (
            typeof options.section.wordLimitMin === "number" &&
            words < options.section.wordLimitMin
        ) {
            throw new AuthError(
                `Narrative response must be at least ${options.section.wordLimitMin} words.`,
                400
            );
        }

        if (
            typeof options.section.wordLimitMax === "number" &&
            words > options.section.wordLimitMax
        ) {
            throw new AuthError(
                `Narrative response must not exceed ${options.section.wordLimitMax} words.`,
                400
            );
        }
    }

    if (
        options.metric.evidenceMode === "Required" &&
        !((options.response.documentIds?.length ?? 0) || (options.response.supportingLinks?.length ?? 0))
    ) {
        throw new AuthError("Supporting evidence is required before submission.", 400);
    }
}

function mapSsrDocumentRecord(document: any) {
    return {
        id: document._id.toString(),
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        fileType: document.fileType,
        uploadedAt: document.uploadedAt,
        verificationStatus: document.verificationStatus,
        verificationRemarks: document.verificationRemarks,
    };
}

function mapCycleRecord(record: any, institutions: Map<string, string>, academicYears: Map<string, string>) {
    return {
        _id: record._id.toString(),
        title: record.title,
        code: record.code,
        framework: record.framework,
        description: record.description,
        status: record.status,
        institutionId: record.institutionId?.toString(),
        institutionName: record.institutionId ? institutions.get(record.institutionId.toString()) : "",
        academicYearId: record.academicYearId?.toString(),
        academicYearLabel: record.academicYearId ? academicYears.get(record.academicYearId.toString()) : "",
        submissionWindowStart: record.submissionWindowStart,
        submissionWindowEnd: record.submissionWindowEnd,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
    };
}

export async function getSsrAdminConsole() {
    await dbConnect();

    const [
        cycles,
        criteria,
        metrics,
        sections,
        assignments,
        responses,
        institutions,
        academicYears,
        users,
    ] = await Promise.all([
        SsrCycle.find().sort({ updatedAt: -1 }).lean(),
        SsrCriterion.find().sort({ displayOrder: 1, criterionCode: 1 }).lean(),
        SsrMetric.find().sort({ displayOrder: 1, metricCode: 1 }).lean(),
        SsrNarrativeSection.find().sort({ displayOrder: 1, title: 1 }).lean(),
        SsrAssignment.find().sort({ updatedAt: -1 }).lean(),
        SsrMetricResponse.find().sort({ updatedAt: -1 }).lean(),
        Institution.find().sort({ name: 1 }).select("name").lean(),
        AcademicYear.find().sort({ yearStart: -1 }).lean(),
        User.find({
            isActive: true,
            accountStatus: "Active",
            emailVerified: true,
        })
            .sort({ name: 1 })
            .select("name email role department collegeName universityName")
            .lean(),
    ]);

    const institutionMap = new Map(institutions.map((item) => [item._id.toString(), item.name]));
    const academicYearMap = new Map(
        academicYears.map((item) => [
            item._id.toString(),
            formatAcademicYearLabel(item.yearStart, item.yearEnd),
        ])
    );
    const cycleMap = new Map(cycles.map((item) => [item._id.toString(), item]));
    const criterionMap = new Map(criteria.map((item) => [item._id.toString(), item]));
    const metricMap = new Map(metrics.map((item) => [item._id.toString(), item]));
    const sectionMap = new Map(sections.map((item) => [item._id.toString(), item]));
    const userMap = new Map(users.map((item) => [item._id.toString(), item]));
    const assignmentMap = new Map(assignments.map((item) => [item._id.toString(), item]));

    return {
        cycles: cycles.map((record) => mapCycleRecord(record, institutionMap, academicYearMap)),
        criteria: criteria.map((record) => ({
            _id: record._id.toString(),
            cycleId: record.cycleId.toString(),
            cycleTitle: cycleMap.get(record.cycleId.toString())?.title ?? "",
            criterionCode: record.criterionCode,
            title: record.title,
            description: record.description,
            weightage: record.weightage,
            displayOrder: record.displayOrder,
            isActive: record.isActive,
        })),
        metrics: metrics.map((record) => ({
            _id: record._id.toString(),
            cycleId: record.cycleId.toString(),
            criterionId: record.criterionId.toString(),
            criterionCode: criterionMap.get(record.criterionId.toString())?.criterionCode ?? "",
            criterionTitle: criterionMap.get(record.criterionId.toString())?.title ?? "",
            metricCode: record.metricCode,
            title: record.title,
            description: record.description,
            instructions: record.instructions,
            metricType: record.metricType,
            dataType: record.dataType,
            ownershipScope: record.ownershipScope,
            sourceModule: record.sourceModule,
            benchmarkValue: record.benchmarkValue,
            unitLabel: record.unitLabel,
            evidenceMode: record.evidenceMode,
            allowedContributorRoles: record.allowedContributorRoles,
            displayOrder: record.displayOrder,
            isActive: record.isActive,
        })),
        sections: sections.map((record) => ({
            _id: record._id.toString(),
            cycleId: record.cycleId.toString(),
            criterionId: record.criterionId.toString(),
            metricId: record.metricId.toString(),
            metricCode: metricMap.get(record.metricId.toString())?.metricCode ?? "",
            metricTitle: metricMap.get(record.metricId.toString())?.title ?? "",
            sectionKey: record.sectionKey,
            title: record.title,
            prompt: record.prompt,
            guidance: record.guidance,
            wordLimitMin: record.wordLimitMin,
            wordLimitMax: record.wordLimitMax,
            displayOrder: record.displayOrder,
            isActive: record.isActive,
        })),
        assignments: assignments.map((record) => ({
            _id: record._id.toString(),
            cycleId: record.cycleId.toString(),
            cycleTitle: cycleMap.get(record.cycleId.toString())?.title ?? "",
            criterionId: record.criterionId.toString(),
            criterionCode: criterionMap.get(record.criterionId.toString())?.criterionCode ?? "",
            criterionTitle: criterionMap.get(record.criterionId.toString())?.title ?? "",
            metricId: record.metricId.toString(),
            metricCode: metricMap.get(record.metricId.toString())?.metricCode ?? "",
            metricTitle: metricMap.get(record.metricId.toString())?.title ?? "",
            sectionId: record.sectionId?.toString(),
            sectionTitle: record.sectionId ? sectionMap.get(record.sectionId.toString())?.title ?? "" : "",
            assigneeUserId: record.assigneeUserId.toString(),
            assigneeName: userMap.get(record.assigneeUserId.toString())?.name ?? "",
            assigneeEmail: userMap.get(record.assigneeUserId.toString())?.email ?? "",
            assigneeRole: record.assigneeRole,
            dueDate: record.dueDate,
            notes: record.notes,
            status: record.status,
            isActive: record.isActive,
            scopeDepartmentName: record.scopeDepartmentName,
            scopeUniversityName: record.scopeUniversityName,
            updatedAt: record.updatedAt,
        })),
        responses: responses.map((record) => {
            const assignment = assignmentMap.get(record.assignmentId.toString());
            const contributor = userMap.get(record.contributorUserId.toString());

            return {
                _id: record._id.toString(),
                assignmentId: record.assignmentId.toString(),
                cycleTitle: assignment ? cycleMap.get(assignment.cycleId.toString())?.title ?? "" : "",
                criterionCode: assignment
                    ? criterionMap.get(assignment.criterionId.toString())?.criterionCode ?? ""
                    : "",
                metricCode: assignment ? metricMap.get(assignment.metricId.toString())?.metricCode ?? "" : "",
                metricTitle: assignment ? metricMap.get(assignment.metricId.toString())?.title ?? "" : "",
                sectionTitle:
                    assignment?.sectionId && sectionMap.get(assignment.sectionId.toString())
                        ? sectionMap.get(assignment.sectionId.toString())?.title ?? ""
                        : "",
                contributorName: contributor?.name ?? "",
                contributorEmail: contributor?.email ?? "",
                contributorRole: contributor?.role ?? "",
                status: record.status,
                version: record.version,
                submittedAt: record.submittedAt,
                reviewedAt: record.reviewedAt,
                approvedAt: record.approvedAt,
                supportingLinkCount: record.supportingLinks?.length ?? 0,
                documentCount: record.documentIds?.length ?? 0,
                updatedAt: record.updatedAt,
                reviewRemarks: record.reviewRemarks,
            };
        }),
        institutionOptions: institutions.map((item) => ({
            id: item._id.toString(),
            label: item.name,
        })),
        academicYearOptions: academicYears.map((item) => ({
            id: item._id.toString(),
            label: formatAcademicYearLabel(item.yearStart, item.yearEnd),
            isActive: item.isActive,
        })),
        userOptions: users.map((item) => ({
            id: item._id.toString(),
            name: item.name,
            email: item.email,
            role: item.role,
            department: item.department,
            collegeName: item.collegeName,
            universityName: item.universityName,
        })),
    };
}

export async function getSsrReviewWorkspace(actor: SsrActor) {
    await dbConnect();

    const profile = await resolveAuthorizationProfile(actor);
    if (actor.role !== "Admin" && !canListModuleRecords(profile, "SSR")) {
        throw new AuthError("Leadership access is required to review SSR submissions.", 403);
    }

    const responseQuery = actor.role === "Admin" ? {} : buildAuthorizedScopeQuery(profile);
    const responses = await SsrMetricResponse.find(responseQuery).sort({ updatedAt: -1 }).lean();

    const assignmentIds = uniqueStrings(responses.map((item) => item.assignmentId?.toString()));
    const cycleIds = uniqueStrings(responses.map((item) => item.cycleId?.toString()));
    const criterionIds = uniqueStrings(responses.map((item) => item.criterionId?.toString()));
    const metricIds = uniqueStrings(responses.map((item) => item.metricId?.toString()));
    const sectionIds = uniqueStrings(responses.map((item) => item.sectionId?.toString()));
    const contributorIds = uniqueStrings(responses.map((item) => item.contributorUserId?.toString()));
    const documentIds = uniqueStrings(
        responses.flatMap((item) => (item.documentIds ?? []).map((documentId) => documentId?.toString()))
    );

    const [assignments, cycles, criteria, metrics, sections, contributors, documents, workflowDefinition] =
        await Promise.all([
            assignmentIds.length
                ? SsrAssignment.find({ _id: { $in: toObjectIdList(assignmentIds) } }).lean()
                : [],
            cycleIds.length ? SsrCycle.find({ _id: { $in: toObjectIdList(cycleIds) } }).lean() : [],
            criterionIds.length
                ? SsrCriterion.find({ _id: { $in: toObjectIdList(criterionIds) } }).lean()
                : [],
            metricIds.length ? SsrMetric.find({ _id: { $in: toObjectIdList(metricIds) } }).lean() : [],
            sectionIds.length
                ? SsrNarrativeSection.find({ _id: { $in: toObjectIdList(sectionIds) } }).lean()
                : [],
            contributorIds.length
                ? User.find({ _id: { $in: toObjectIdList(contributorIds) } })
                      .select("name email role department collegeName universityName")
                      .lean()
                : [],
            documentIds.length
                ? DocumentModel.find({ _id: { $in: toObjectIdList(documentIds) } })
                      .select(
                          "fileName fileUrl fileType uploadedAt verificationStatus verificationRemarks"
                      )
                      .lean()
                : [],
            getActiveWorkflowDefinition("SSR"),
        ]);

    const assignmentMap = new Map(assignments.map((item) => [item._id.toString(), item]));
    const cycleMap = new Map(cycles.map((item) => [item._id.toString(), item]));
    const criterionMap = new Map(criteria.map((item) => [item._id.toString(), item]));
    const metricMap = new Map(metrics.map((item) => [item._id.toString(), item]));
    const sectionMap = new Map(sections.map((item) => [item._id.toString(), item]));
    const contributorMap = new Map(contributors.map((item) => [item._id.toString(), item]));
    const documentMap = new Map(documents.map((item) => [item._id.toString(), item]));

    const records = (
        await Promise.all(
            responses.map(async (response) => {
                const assignment = assignmentMap.get(response.assignmentId.toString());
                const cycle = cycleMap.get(response.cycleId.toString());
                const criterion = criterionMap.get(response.criterionId.toString());
                const metric = metricMap.get(response.metricId.toString());
                const section = response.sectionId
                    ? sectionMap.get(response.sectionId.toString()) ?? null
                    : null;
                const contributor = contributorMap.get(response.contributorUserId.toString());
                const stage = getWorkflowStageByStatus(workflowDefinition, response.status);
                const subjectScope = {
                    departmentName: response.scopeDepartmentName,
                    collegeName: response.scopeCollegeName,
                    universityName: response.scopeUniversityName,
                    departmentId: response.scopeDepartmentId?.toString(),
                    institutionId: response.scopeInstitutionId?.toString(),
                    departmentOrganizationId: response.scopeDepartmentOrganizationId?.toString(),
                    collegeOrganizationId: response.scopeCollegeOrganizationId?.toString(),
                    universityOrganizationId: response.scopeUniversityOrganizationId?.toString(),
                    subjectOrganizationIds:
                        response.scopeOrganizationIds?.map((value) => value.toString()) ?? [],
                };

                const canView =
                    actor.role === "Admin" ? true : canViewModuleRecord(profile, "SSR", subjectScope);
                if (!canView) {
                    return null;
                }

                const canProcessStage = stage
                    ? await canActorProcessWorkflowStage({
                          actor,
                          moduleName: "SSR",
                          recordId: response._id.toString(),
                          status: response.status,
                          subjectDepartmentName: response.scopeDepartmentName,
                          subjectCollegeName: response.scopeCollegeName,
                          subjectUniversityName: response.scopeUniversityName,
                          subjectDepartmentId: response.scopeDepartmentId?.toString(),
                          subjectInstitutionId: response.scopeInstitutionId?.toString(),
                          subjectDepartmentOrganizationId:
                              response.scopeDepartmentOrganizationId?.toString(),
                          subjectCollegeOrganizationId: response.scopeCollegeOrganizationId?.toString(),
                          subjectUniversityOrganizationId:
                              response.scopeUniversityOrganizationId?.toString(),
                          subjectOrganizationIds:
                              response.scopeOrganizationIds?.map((value) => value.toString()) ?? [],
                          stageKinds: [stage.kind],
                      })
                    : false;

                const isReviewStage = Boolean(stage && stage.kind === "review" && canProcessStage);
                const isFinalStage = Boolean(stage && stage.kind === "final" && canProcessStage);
                const availableDecisions = stage
                    ? stage.kind === "final"
                        ? ["Approve", "Reject"]
                        : response.status === "Submitted"
                          ? ["Forward", "Reject"]
                          : ["Recommend", "Reject"]
                    : [];

                return {
                    _id: response._id.toString(),
                    assignmentId: assignment?._id?.toString() ?? response.assignmentId.toString(),
                    cycleTitle: cycle?.title ?? "",
                    cycleCode: cycle?.code ?? "",
                    criterionCode: criterion?.criterionCode ?? "",
                    criterionTitle: criterion?.title ?? "",
                    metricCode: metric?.metricCode ?? "",
                    metricTitle: metric?.title ?? "",
                    metricDescription: metric?.description,
                    metricInstructions: metric?.instructions,
                    metricType: metric?.metricType,
                    dataType: metric?.dataType,
                    ownershipScope: metric?.ownershipScope,
                    evidenceMode: metric?.evidenceMode,
                    sourceModule: metric?.sourceModule,
                    benchmarkValue: metric?.benchmarkValue,
                    unitLabel: metric?.unitLabel,
                    sectionTitle: section?.title ?? "",
                    sectionPrompt: section?.prompt ?? "",
                    sectionGuidance: section?.guidance ?? "",
                    wordLimitMin: section?.wordLimitMin,
                    wordLimitMax: section?.wordLimitMax,
                    contributorName: contributor?.name ?? "",
                    contributorEmail: contributor?.email ?? "",
                    contributorRole: contributor?.role ?? "",
                    status: response.status,
                    assignmentStatus: assignment?.status ?? response.status,
                    dueDate: assignment?.dueDate,
                    assignmentNotes: assignment?.notes,
                    valueSummary: formatMetricValueSummary(metric?.dataType ?? "Text", response),
                    narrativeResponse: response.narrativeResponse ?? "",
                    metricValueNumeric: response.metricValueNumeric,
                    metricValueText: response.metricValueText ?? "",
                    metricValueBoolean: response.metricValueBoolean,
                    metricValueDate: response.metricValueDate,
                    tableData: response.tableData ?? {},
                    supportingLinks: response.supportingLinks ?? [],
                    documents: (response.documentIds ?? [])
                        .map((documentId) => documentMap.get(documentId.toString()))
                        .filter(Boolean)
                        .map(mapSsrDocumentRecord),
                    contributorRemarks: response.contributorRemarks ?? "",
                    reviewRemarks: response.reviewRemarks ?? "",
                    reviewHistory: (response.reviewHistory ?? []).map((entry) => ({
                        reviewerName: entry.reviewerName,
                        reviewerRole: entry.reviewerRole,
                        stage: entry.stage,
                        decision: entry.decision,
                        remarks: entry.remarks,
                        reviewedAt: entry.reviewedAt,
                    })),
                    statusLogs: (response.statusLogs ?? []).map((entry) => ({
                        status: entry.status,
                        actorName: entry.actorName,
                        actorRole: entry.actorRole,
                        remarks: entry.remarks,
                        changedAt: entry.changedAt,
                    })),
                    submittedAt: response.submittedAt,
                    reviewedAt: response.reviewedAt,
                    approvedAt: response.approvedAt,
                    updatedAt: response.updatedAt,
                    scopeDepartmentName: response.scopeDepartmentName,
                    scopeCollegeName: response.scopeCollegeName,
                    scopeUniversityName: response.scopeUniversityName,
                    currentStageLabel: stage?.label ?? "Closed",
                    currentStageKind: stage?.kind ?? null,
                    availableDecisions,
                    permissions: {
                        canView,
                        canReview: isReviewStage,
                        canApprove: isFinalStage,
                        canReject: Boolean(stage && canProcessStage),
                    },
                };
            })
        )
    )
        .filter((record): record is NonNullable<typeof record> => Boolean(record))
        .sort((left, right) =>
            new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime()
        );

    const actionableCount = records.filter(
        (record) => record.permissions.canReview || record.permissions.canApprove
    ).length;

    return {
        records,
        summary: {
            total: records.length,
            actionableCount,
            pendingCount: records.filter((record) =>
                ["Submitted", "Under Review", "Committee Review"].includes(record.status)
            ).length,
            approvedCount: records.filter((record) => record.status === "Approved").length,
            rejectedCount: records.filter((record) => record.status === "Rejected").length,
        },
    };
}

export async function createSsrCycle(actor: SsrActor, rawInput: unknown) {
    await assertAdmin(actor);
    const input = ssrCycleSchema.parse(rawInput);
    await dbConnect();
    await resolveCycleReferences(undefined, input.academicYearId, input.institutionId);

    const cycle = await SsrCycle.create({
        institutionId: toOptionalObjectId(input.institutionId),
        academicYearId: toOptionalObjectId(input.academicYearId),
        title: input.title,
        code: input.code.toUpperCase(),
        framework: input.framework,
        description: input.description,
        status: input.status,
        submissionWindowStart: toOptionalDate(input.submissionWindowStart),
        submissionWindowEnd: toOptionalDate(input.submissionWindowEnd),
        createdBy: new Types.ObjectId(actor.id),
        activatedAt: input.status === "Active" ? new Date() : undefined,
        lockedAt: input.status === "Locked" ? new Date() : undefined,
    });

    await createAuditLog({
        actor,
        action: "SSR_CYCLE_CREATE",
        tableName: "ssr_cycles",
        recordId: cycle._id.toString(),
        newData: cycle.toObject(),
        auditContext: actor.auditContext,
    });

    return cycle;
}

export async function updateSsrCycle(actor: SsrActor, id: string, rawInput: unknown) {
    await assertAdmin(actor);
    const input = ssrCycleUpdateSchema.parse(rawInput);
    await dbConnect();
    const cycle = await SsrCycle.findById(id);

    if (!cycle) {
        throw new AuthError("SSR cycle not found.", 404);
    }

    const oldState = cycle.toObject();

    if (input.institutionId !== undefined) {
        cycle.institutionId = toOptionalObjectId(input.institutionId);
    }
    if (input.academicYearId !== undefined) {
        cycle.academicYearId = toOptionalObjectId(input.academicYearId);
    }
    if (input.title !== undefined) {
        cycle.title = input.title;
    }
    if (input.code !== undefined) {
        cycle.code = input.code.toUpperCase();
    }
    if (input.framework !== undefined) {
        cycle.framework = input.framework;
    }
    if (input.description !== undefined) {
        cycle.description = input.description;
    }
    if (input.status !== undefined) {
        cycle.status = input.status;
        if (input.status === "Active") {
            cycle.activatedAt = new Date();
        }
        if (input.status === "Locked") {
            cycle.lockedAt = new Date();
        }
    }
    if (input.submissionWindowStart !== undefined) {
        cycle.submissionWindowStart = toOptionalDate(input.submissionWindowStart);
    }
    if (input.submissionWindowEnd !== undefined) {
        cycle.submissionWindowEnd = toOptionalDate(input.submissionWindowEnd);
    }

    await cycle.save();

    await createAuditLog({
        actor,
        action: "SSR_CYCLE_UPDATE",
        tableName: "ssr_cycles",
        recordId: cycle._id.toString(),
        oldData: oldState,
        newData: cycle.toObject(),
        auditContext: actor.auditContext,
    });

    return cycle;
}

export async function createSsrCriterion(actor: SsrActor, rawInput: unknown) {
    await assertAdmin(actor);
    const input = ssrCriterionSchema.parse(rawInput);
    await dbConnect();

    const cycle = await SsrCycle.findById(input.cycleId);
    if (!cycle) {
        throw new AuthError("SSR cycle not found.", 404);
    }

    const criterion = await SsrCriterion.create({
        cycleId: new Types.ObjectId(input.cycleId),
        criterionCode: input.criterionCode.toUpperCase(),
        title: input.title,
        description: input.description,
        weightage: input.weightage,
        displayOrder: input.displayOrder,
        isActive: input.isActive,
    });

    await createAuditLog({
        actor,
        action: "SSR_CRITERION_CREATE",
        tableName: "ssr_criteria",
        recordId: criterion._id.toString(),
        newData: criterion.toObject(),
        auditContext: actor.auditContext,
    });

    return criterion;
}

export async function updateSsrCriterion(actor: SsrActor, id: string, rawInput: unknown) {
    await assertAdmin(actor);
    const input = ssrCriterionUpdateSchema.parse(rawInput);
    await dbConnect();

    const criterion = await SsrCriterion.findById(id);
    if (!criterion) {
        throw new AuthError("SSR criterion not found.", 404);
    }

    const oldState = criterion.toObject();

    if (input.cycleId !== undefined) {
        const cycle = await SsrCycle.findById(input.cycleId);
        if (!cycle) {
            throw new AuthError("SSR cycle not found.", 404);
        }
        criterion.cycleId = new Types.ObjectId(input.cycleId);
    }
    if (input.criterionCode !== undefined) {
        criterion.criterionCode = input.criterionCode.toUpperCase();
    }
    if (input.title !== undefined) {
        criterion.title = input.title;
    }
    if (input.description !== undefined) {
        criterion.description = input.description;
    }
    if (input.weightage !== undefined) {
        criterion.weightage = input.weightage;
    }
    if (input.displayOrder !== undefined) {
        criterion.displayOrder = input.displayOrder;
    }
    if (input.isActive !== undefined) {
        criterion.isActive = input.isActive;
    }

    await criterion.save();

    await createAuditLog({
        actor,
        action: "SSR_CRITERION_UPDATE",
        tableName: "ssr_criteria",
        recordId: criterion._id.toString(),
        oldData: oldState,
        newData: criterion.toObject(),
        auditContext: actor.auditContext,
    });

    return criterion;
}

export async function createSsrMetric(actor: SsrActor, rawInput: unknown) {
    await assertAdmin(actor);
    const input = ssrMetricSchema.parse(rawInput);
    await dbConnect();

    const criterion = await SsrCriterion.findById(input.criterionId);
    if (!criterion || criterion.cycleId.toString() !== input.cycleId) {
        throw new AuthError("Selected criterion does not belong to the selected cycle.", 400);
    }

    const metric = await SsrMetric.create({
        cycleId: new Types.ObjectId(input.cycleId),
        criterionId: new Types.ObjectId(input.criterionId),
        metricCode: input.metricCode.toUpperCase(),
        title: input.title,
        description: input.description,
        instructions: input.instructions,
        metricType: input.metricType,
        dataType: input.dataType,
        ownershipScope: input.ownershipScope,
        sourceModule: input.sourceModule,
        benchmarkValue: input.benchmarkValue,
        unitLabel: input.unitLabel,
        evidenceMode: input.evidenceMode,
        allowedContributorRoles: input.allowedContributorRoles,
        displayOrder: input.displayOrder,
        isActive: input.isActive,
    });

    await createAuditLog({
        actor,
        action: "SSR_METRIC_CREATE",
        tableName: "ssr_metrics",
        recordId: metric._id.toString(),
        newData: metric.toObject(),
        auditContext: actor.auditContext,
    });

    return metric;
}

export async function updateSsrMetric(actor: SsrActor, id: string, rawInput: unknown) {
    await assertAdmin(actor);
    const input = ssrMetricUpdateSchema.parse(rawInput);
    await dbConnect();

    const metric = await SsrMetric.findById(id);
    if (!metric) {
        throw new AuthError("SSR metric not found.", 404);
    }

    const oldState = metric.toObject();
    let nextCycleId = metric.cycleId.toString();
    let nextCriterionId = metric.criterionId.toString();

    if (input.cycleId !== undefined) {
        nextCycleId = input.cycleId;
    }
    if (input.criterionId !== undefined) {
        nextCriterionId = input.criterionId;
    }

    const criterion = await SsrCriterion.findById(nextCriterionId);
    if (!criterion || criterion.cycleId.toString() !== nextCycleId) {
        throw new AuthError("Selected criterion does not belong to the selected cycle.", 400);
    }

    metric.cycleId = new Types.ObjectId(nextCycleId);
    metric.criterionId = new Types.ObjectId(nextCriterionId);

    if (input.metricCode !== undefined) {
        metric.metricCode = input.metricCode.toUpperCase();
    }
    if (input.title !== undefined) {
        metric.title = input.title;
    }
    if (input.description !== undefined) {
        metric.description = input.description;
    }
    if (input.instructions !== undefined) {
        metric.instructions = input.instructions;
    }
    if (input.metricType !== undefined) {
        metric.metricType = input.metricType;
    }
    if (input.dataType !== undefined) {
        metric.dataType = input.dataType;
    }
    if (input.ownershipScope !== undefined) {
        metric.ownershipScope = input.ownershipScope;
    }
    if (input.sourceModule !== undefined) {
        metric.sourceModule = input.sourceModule;
    }
    if (input.benchmarkValue !== undefined) {
        metric.benchmarkValue = input.benchmarkValue;
    }
    if (input.unitLabel !== undefined) {
        metric.unitLabel = input.unitLabel;
    }
    if (input.evidenceMode !== undefined) {
        metric.evidenceMode = input.evidenceMode;
    }
    if (input.allowedContributorRoles !== undefined) {
        metric.allowedContributorRoles = input.allowedContributorRoles;
    }
    if (input.displayOrder !== undefined) {
        metric.displayOrder = input.displayOrder;
    }
    if (input.isActive !== undefined) {
        metric.isActive = input.isActive;
    }

    await metric.save();

    await createAuditLog({
        actor,
        action: "SSR_METRIC_UPDATE",
        tableName: "ssr_metrics",
        recordId: metric._id.toString(),
        oldData: oldState,
        newData: metric.toObject(),
        auditContext: actor.auditContext,
    });

    return metric;
}

export async function createSsrNarrativeSection(actor: SsrActor, rawInput: unknown) {
    await assertAdmin(actor);
    const input = ssrNarrativeSectionSchema.parse(rawInput);
    await dbConnect();
    await ensureCycleHierarchy({
        cycleId: input.cycleId,
        criterionId: input.criterionId,
        metricId: input.metricId,
    });

    const section = await SsrNarrativeSection.create({
        cycleId: new Types.ObjectId(input.cycleId),
        criterionId: new Types.ObjectId(input.criterionId),
        metricId: new Types.ObjectId(input.metricId),
        sectionKey: input.sectionKey,
        title: input.title,
        prompt: input.prompt,
        guidance: input.guidance,
        wordLimitMin: input.wordLimitMin,
        wordLimitMax: input.wordLimitMax,
        displayOrder: input.displayOrder,
        isActive: input.isActive,
    });

    await createAuditLog({
        actor,
        action: "SSR_SECTION_CREATE",
        tableName: "ssr_narrative_sections",
        recordId: section._id.toString(),
        newData: section.toObject(),
        auditContext: actor.auditContext,
    });

    return section;
}

export async function updateSsrNarrativeSection(actor: SsrActor, id: string, rawInput: unknown) {
    await assertAdmin(actor);
    const input = ssrNarrativeSectionUpdateSchema.parse(rawInput);
    await dbConnect();

    const section = await SsrNarrativeSection.findById(id);
    if (!section) {
        throw new AuthError("SSR narrative section not found.", 404);
    }

    const oldState = section.toObject();
    const nextCycleId = input.cycleId ?? section.cycleId.toString();
    const nextCriterionId = input.criterionId ?? section.criterionId.toString();
    const nextMetricId = input.metricId ?? section.metricId.toString();

    await ensureCycleHierarchy({
        cycleId: nextCycleId,
        criterionId: nextCriterionId,
        metricId: nextMetricId,
    });

    section.cycleId = new Types.ObjectId(nextCycleId);
    section.criterionId = new Types.ObjectId(nextCriterionId);
    section.metricId = new Types.ObjectId(nextMetricId);

    if (input.sectionKey !== undefined) {
        section.sectionKey = input.sectionKey;
    }
    if (input.title !== undefined) {
        section.title = input.title;
    }
    if (input.prompt !== undefined) {
        section.prompt = input.prompt;
    }
    if (input.guidance !== undefined) {
        section.guidance = input.guidance;
    }
    if (input.wordLimitMin !== undefined) {
        section.wordLimitMin = input.wordLimitMin;
    }
    if (input.wordLimitMax !== undefined) {
        section.wordLimitMax = input.wordLimitMax;
    }
    if (input.displayOrder !== undefined) {
        section.displayOrder = input.displayOrder;
    }
    if (input.isActive !== undefined) {
        section.isActive = input.isActive;
    }

    await section.save();

    await createAuditLog({
        actor,
        action: "SSR_SECTION_UPDATE",
        tableName: "ssr_narrative_sections",
        recordId: section._id.toString(),
        oldData: oldState,
        newData: section.toObject(),
        auditContext: actor.auditContext,
    });

    return section;
}

export async function createSsrAssignment(actor: SsrActor, rawInput: unknown) {
    await assertAdmin(actor);
    const input = ssrAssignmentSchema.parse(rawInput);
    await dbConnect();

    const { cycle, criterion, metric, section } = await ensureCycleHierarchy({
        cycleId: input.cycleId,
        criterionId: input.criterionId,
        metricId: input.metricId,
        sectionId: input.sectionId,
    });

    if (["Locked", "Archived"].includes(cycle.status)) {
        throw new AuthError("Assignments cannot be created on locked or archived SSR cycles.", 409);
    }

    const assignee = await getUserSnapshot(input.assigneeUserId);
    if (!metric.allowedContributorRoles.includes(assignee.role as any)) {
        throw new AuthError(
            `This metric only accepts contributions from: ${metric.allowedContributorRoles.join(", ")}.`,
            400
        );
    }

    const subjectScope = await resolveUserSubjectScope(assignee);
    const assignment = await SsrAssignment.create({
        cycleId: cycle._id,
        criterionId: criterion._id,
        metricId: metric._id,
        sectionId: section?._id,
        assigneeUserId: assignee._id,
        assignedBy: new Types.ObjectId(actor.id),
        assigneeRole: assignee.role,
        dueDate: toOptionalDate(input.dueDate),
        notes: input.notes,
        status: "Draft",
        ...toScopeSnapshot(subjectScope),
        isActive: input.isActive,
    });

    await createAuditLog({
        actor,
        action: "SSR_ASSIGNMENT_CREATE",
        tableName: "ssr_assignments",
        recordId: assignment._id.toString(),
        newData: assignment.toObject(),
        auditContext: actor.auditContext,
    });

    return assignment;
}

export async function updateSsrAssignment(actor: SsrActor, id: string, rawInput: unknown) {
    await assertAdmin(actor);
    if (
        rawInput &&
        typeof rawInput === "object" &&
        !Array.isArray(rawInput) &&
        "status" in rawInput
    ) {
        throw new AuthError("SSR assignment status is workflow-managed and cannot be edited manually.", 400);
    }
    const input = ssrAssignmentUpdateSchema.parse(rawInput);
    await dbConnect();

    const assignment = await SsrAssignment.findById(id);
    if (!assignment) {
        throw new AuthError("SSR assignment not found.", 404);
    }

    const response = await SsrMetricResponse.findOne({ assignmentId: assignment._id });
    const oldState = assignment.toObject();
    const hasResponseStarted = Boolean(response);
    const isStructuralUpdate =
        input.cycleId !== undefined ||
        input.criterionId !== undefined ||
        input.metricId !== undefined ||
        input.sectionId !== undefined ||
        input.assigneeUserId !== undefined;

    if (hasResponseStarted && isStructuralUpdate) {
        throw new AuthError(
            "This assignment already has a response in progress. Create a new assignment instead of remapping it.",
            409
        );
    }

    if (
        input.cycleId !== undefined ||
        input.criterionId !== undefined ||
        input.metricId !== undefined ||
        input.sectionId !== undefined
    ) {
        const nextCycleId = input.cycleId ?? assignment.cycleId.toString();
        const nextCriterionId = input.criterionId ?? assignment.criterionId.toString();
        const nextMetricId = input.metricId ?? assignment.metricId.toString();
        const nextSectionId = input.sectionId ?? assignment.sectionId?.toString();

        const { cycle, criterion, metric, section } = await ensureCycleHierarchy({
            cycleId: nextCycleId,
            criterionId: nextCriterionId,
            metricId: nextMetricId,
            sectionId: nextSectionId,
        });

        assignment.cycleId = cycle._id;
        assignment.criterionId = criterion._id;
        assignment.metricId = metric._id;
        assignment.sectionId = section?._id;
    }

    if (input.assigneeUserId !== undefined) {
        const assignee = await getUserSnapshot(input.assigneeUserId);
        const metric = await SsrMetric.findById(assignment.metricId).select("allowedContributorRoles");
        if (!metric) {
            throw new AuthError("SSR metric not found.", 404);
        }

        if (!metric.allowedContributorRoles.includes(assignee.role as any)) {
            throw new AuthError(
                `This metric only accepts contributions from: ${metric.allowedContributorRoles.join(", ")}.`,
                400
            );
        }

        const subjectScope = await resolveUserSubjectScope(assignee);
        assignment.assigneeUserId = assignee._id;
        assignment.assigneeRole = assignee.role;
        assignment.scopeDepartmentName = subjectScope.departmentName;
        assignment.scopeCollegeName = subjectScope.collegeName;
        assignment.scopeUniversityName = subjectScope.universityName;
        assignment.scopeDepartmentId =
            subjectScope.departmentId && Types.ObjectId.isValid(subjectScope.departmentId)
                ? new Types.ObjectId(subjectScope.departmentId)
                : undefined;
        assignment.scopeInstitutionId =
            subjectScope.institutionId && Types.ObjectId.isValid(subjectScope.institutionId)
                ? new Types.ObjectId(subjectScope.institutionId)
                : undefined;
        assignment.scopeDepartmentOrganizationId =
            subjectScope.departmentOrganizationId &&
            Types.ObjectId.isValid(subjectScope.departmentOrganizationId)
                ? new Types.ObjectId(subjectScope.departmentOrganizationId)
                : undefined;
        assignment.scopeCollegeOrganizationId =
            subjectScope.collegeOrganizationId &&
            Types.ObjectId.isValid(subjectScope.collegeOrganizationId)
                ? new Types.ObjectId(subjectScope.collegeOrganizationId)
                : undefined;
        assignment.scopeUniversityOrganizationId =
            subjectScope.universityOrganizationId &&
            Types.ObjectId.isValid(subjectScope.universityOrganizationId)
                ? new Types.ObjectId(subjectScope.universityOrganizationId)
                : undefined;
        assignment.scopeOrganizationIds = toObjectIdList(subjectScope.subjectOrganizationIds);
    }

    if (input.dueDate !== undefined) {
        assignment.dueDate = toOptionalDate(input.dueDate);
    }
    if (input.notes !== undefined) {
        assignment.notes = input.notes;
    }
    if (input.isActive !== undefined) {
        assignment.isActive = input.isActive;
    }

    await assignment.save();
    if (response && ["Draft", "Rejected"].includes(response.status)) {
        response.cycleId = assignment.cycleId;
        response.criterionId = assignment.criterionId;
        response.metricId = assignment.metricId;
        response.sectionId = assignment.sectionId;
        response.contributorUserId = assignment.assigneeUserId;
        response.status = assignment.status;
        copyScopeToResponse(response, assignment);
        await response.save();
    }

    await createAuditLog({
        actor,
        action: "SSR_ASSIGNMENT_UPDATE",
        tableName: "ssr_assignments",
        recordId: assignment._id.toString(),
        oldData: oldState,
        newData: assignment.toObject(),
        auditContext: actor.auditContext,
    });

    return assignment;
}

function mapContributorAssignmentRecord(
    assignment: any,
    response: any | undefined,
    cycleMap: Map<string, any>,
    criterionMap: Map<string, any>,
    metricMap: Map<string, any>,
    sectionMap: Map<string, any>
) {
    const cycle = cycleMap.get(assignment.cycleId.toString());
    const criterion = criterionMap.get(assignment.criterionId.toString());
    const metric = metricMap.get(assignment.metricId.toString());
    const section = assignment.sectionId ? sectionMap.get(assignment.sectionId.toString()) : null;

    return {
        _id: assignment._id.toString(),
        cycleId: assignment.cycleId.toString(),
        cycleTitle: cycle?.title ?? "",
        cycleCode: cycle?.code ?? "",
        cycleStatus: cycle?.status ?? "",
        criterionId: assignment.criterionId.toString(),
        criterionCode: criterion?.criterionCode ?? "",
        criterionTitle: criterion?.title ?? "",
        metricId: assignment.metricId.toString(),
        metricCode: metric?.metricCode ?? "",
        metricTitle: metric?.title ?? "",
        metricDescription: metric?.description,
        metricInstructions: metric?.instructions,
        metricType: metric?.metricType,
        dataType: metric?.dataType,
        ownershipScope: metric?.ownershipScope,
        evidenceMode: metric?.evidenceMode,
        unitLabel: metric?.unitLabel,
        sectionId: assignment.sectionId?.toString(),
        sectionTitle: section?.title ?? "",
        sectionPrompt: section?.prompt ?? "",
        sectionGuidance: section?.guidance ?? "",
        wordLimitMin: section?.wordLimitMin,
        wordLimitMax: section?.wordLimitMax,
        dueDate: assignment.dueDate,
        notes: assignment.notes,
        status: assignment.status,
        isActive: assignment.isActive,
        response: response
            ? {
                  _id: response._id.toString(),
                  status: response.status,
                  version: response.version,
                  narrativeResponse: response.narrativeResponse ?? "",
                  metricValueNumeric: response.metricValueNumeric,
                  metricValueText: response.metricValueText ?? "",
                  metricValueBoolean: response.metricValueBoolean,
                  metricValueDate: response.metricValueDate,
                  tableData: response.tableData ?? {},
                  supportingLinks: response.supportingLinks ?? [],
                  documentIds: (response.documentIds ?? []).map((value: any) => value.toString()),
                  contributorRemarks: response.contributorRemarks ?? "",
                  reviewRemarks: response.reviewRemarks ?? "",
                  submittedAt: response.submittedAt,
                  reviewedAt: response.reviewedAt,
                  approvedAt: response.approvedAt,
              }
            : null,
    };
}

export async function getSsrContributorWorkspace(actor: SsrActor) {
    await dbConnect();

    const assignments = await SsrAssignment.find({
        assigneeUserId: new Types.ObjectId(actor.id),
        isActive: true,
    })
        .sort({ dueDate: 1, updatedAt: -1 })
        .lean();

    const assignmentIds = assignments.map((item) => item._id);
    const [responses, cycles, criteria, metrics, sections] = await Promise.all([
        assignmentIds.length
            ? SsrMetricResponse.find({ assignmentId: { $in: assignmentIds } }).lean()
            : [],
        SsrCycle.find({
            _id: { $in: uniqueStrings(assignments.map((item) => item.cycleId?.toString())).map((value) => new Types.ObjectId(value)) },
        }).lean(),
        SsrCriterion.find({
            _id: { $in: uniqueStrings(assignments.map((item) => item.criterionId?.toString())).map((value) => new Types.ObjectId(value)) },
        }).lean(),
        SsrMetric.find({
            _id: { $in: uniqueStrings(assignments.map((item) => item.metricId?.toString())).map((value) => new Types.ObjectId(value)) },
        }).lean(),
        SsrNarrativeSection.find({
            _id: {
                $in: uniqueStrings(assignments.map((item) => item.sectionId?.toString())).map(
                    (value) => new Types.ObjectId(value)
                ),
            },
        }).lean(),
    ]);

    const responseMap = new Map(responses.map((item) => [item.assignmentId.toString(), item]));
    const cycleMap = new Map(cycles.map((item) => [item._id.toString(), item]));
    const criterionMap = new Map(criteria.map((item) => [item._id.toString(), item]));
    const metricMap = new Map(metrics.map((item) => [item._id.toString(), item]));
    const sectionMap = new Map(sections.map((item) => [item._id.toString(), item]));

    return {
        assignments: assignments.map((assignment) =>
            mapContributorAssignmentRecord(
                assignment,
                responseMap.get(assignment._id.toString()),
                cycleMap,
                criterionMap,
                metricMap,
                sectionMap
            )
        ),
    };
}

export async function saveSsrMetricResponseDraft(actor: SsrActor, assignmentId: string, rawInput: unknown) {
    const input = ssrResponseDraftSchema.parse(rawInput);
    await dbConnect();

    const assignment = await getAssignmentForActor(actor, assignmentId);
    const cycle = await SsrCycle.findById(assignment.cycleId).select("status");
    if (!cycle) {
        throw new AuthError("SSR cycle not found.", 404);
    }

    if (["Locked", "Archived"].includes(cycle.status)) {
        throw new AuthError("This SSR cycle is locked and can no longer be edited.", 409);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or returned SSR assignments can be edited.", 409);
    }

    await validateDocumentIds(input.documentIds);

    let response = await SsrMetricResponse.findOne({ assignmentId: assignment._id });
    const oldState = response?.toObject();

    if (!response) {
        response = new SsrMetricResponse({
            assignmentId: assignment._id,
            cycleId: assignment.cycleId,
            criterionId: assignment.criterionId,
            metricId: assignment.metricId,
            sectionId: assignment.sectionId,
            contributorUserId: assignment.assigneeUserId,
            status: assignment.status,
            version: 1,
        });
        copyScopeToResponse(response, assignment);
        pushStatusLog(response, assignment.status, actor, "SSR response draft created.");
    } else {
        response.version += 1;
    }

    response.narrativeResponse = input.narrativeResponse || undefined;
    response.metricValueNumeric = input.metricValueNumeric;
    response.metricValueText = input.metricValueText || undefined;
    response.metricValueBoolean = input.metricValueBoolean;
    response.metricValueDate = toOptionalDate(input.metricValueDate);
    response.tableData = input.tableData;
    response.supportingLinks = input.supportingLinks;
    response.documentIds = input.documentIds.map((value) => new Types.ObjectId(value));
    response.contributorRemarks = input.contributorRemarks || undefined;
    response.status = assignment.status;

    await response.save();

    await createAuditLog({
        actor,
        action: oldState ? "SSR_RESPONSE_UPDATE" : "SSR_RESPONSE_CREATE",
        tableName: "ssr_metric_responses",
        recordId: response._id.toString(),
        oldData: oldState,
        newData: response.toObject(),
        auditContext: actor.auditContext,
    });

    return response;
}

export async function submitSsrMetricResponse(actor: SsrActor, assignmentId: string) {
    await dbConnect();

    const assignment = await getAssignmentForActor(actor, assignmentId);
    const [cycle, metric, section, response] = await Promise.all([
        SsrCycle.findById(assignment.cycleId).select("status"),
        SsrMetric.findById(assignment.metricId).select("dataType evidenceMode"),
        assignment.sectionId
            ? SsrNarrativeSection.findById(assignment.sectionId).select("wordLimitMin wordLimitMax")
            : null,
        SsrMetricResponse.findOne({ assignmentId: assignment._id }),
    ]);

    if (!cycle) {
        throw new AuthError("SSR cycle not found.", 404);
    }

    if (["Locked", "Archived"].includes(cycle.status)) {
        throw new AuthError("This SSR cycle is locked and can no longer accept submissions.", 409);
    }

    if (!metric) {
        throw new AuthError("SSR metric not found.", 404);
    }

    if (!response) {
        throw new AuthError("Save the SSR response before submitting it.", 400);
    }

    if (!["Draft", "Rejected"].includes(assignment.status)) {
        throw new AuthError("Only draft or returned SSR assignments can be submitted.", 409);
    }

    validateResponseForSubmission({
        metric,
        section,
        response,
    });

    const workflowDefinition = await getActiveWorkflowDefinition("SSR");
    const nextStatus = resolveWorkflowTransition(workflowDefinition, assignment.status, "submit")
        .status as SsrWorkflowStatus;
    const now = new Date();
    const oldAssignment = assignment.toObject();
    const oldResponse = response.toObject();

    assignment.status = nextStatus;
    assignment.submittedAt = now;
    await assignment.save();

    response.status = nextStatus;
    response.submittedAt = now;
    pushStatusLog(response, nextStatus, actor, "SSR response submitted.");
    await response.save();

    await syncWorkflowInstanceState({
        moduleName: "SSR",
        recordId: response._id.toString(),
        status: response.status,
        subjectDepartmentName: assignment.scopeDepartmentName,
        subjectCollegeName: assignment.scopeCollegeName,
        subjectUniversityName: assignment.scopeUniversityName,
        subjectDepartmentId: assignment.scopeDepartmentId?.toString(),
        subjectInstitutionId: assignment.scopeInstitutionId?.toString(),
        subjectDepartmentOrganizationId: assignment.scopeDepartmentOrganizationId?.toString(),
        subjectCollegeOrganizationId: assignment.scopeCollegeOrganizationId?.toString(),
        subjectUniversityOrganizationId: assignment.scopeUniversityOrganizationId?.toString(),
        subjectOrganizationIds: assignment.scopeOrganizationIds?.map((value) => value.toString()) ?? [],
        actor,
        remarks: "SSR response submitted.",
        action: "submit",
    });

    await createAuditLog({
        actor,
        action: "SSR_RESPONSE_SUBMIT",
        tableName: "ssr_metric_responses",
        recordId: response._id.toString(),
        oldData: { assignment: oldAssignment, response: oldResponse },
        newData: { assignment: assignment.toObject(), response: response.toObject() },
        auditContext: actor.auditContext,
    });

    return response;
}

export async function reviewSsrMetricResponse(actor: SsrActor, responseId: string, rawInput: unknown) {
    const input = ssrReviewSchema.parse(rawInput);
    await dbConnect();

    const response = await SsrMetricResponse.findById(responseId);
    if (!response) {
        throw new AuthError("SSR response not found.", 404);
    }

    const assignment = await SsrAssignment.findById(response.assignmentId);
    if (!assignment) {
        throw new AuthError("SSR assignment not found.", 404);
    }

    const workflowDefinition = await getActiveWorkflowDefinition("SSR");
    const currentStage = getWorkflowStageByStatus(workflowDefinition, response.status);

    if (!currentStage) {
        throw new AuthError("This SSR response is not pending review.", 409);
    }

    const canReview = await canActorProcessWorkflowStage({
        actor,
        moduleName: "SSR",
        recordId: response._id.toString(),
        status: response.status,
        subjectDepartmentName: response.scopeDepartmentName,
        subjectCollegeName: response.scopeCollegeName,
        subjectUniversityName: response.scopeUniversityName,
        subjectDepartmentId: response.scopeDepartmentId?.toString(),
        subjectInstitutionId: response.scopeInstitutionId?.toString(),
        subjectDepartmentOrganizationId: response.scopeDepartmentOrganizationId?.toString(),
        subjectCollegeOrganizationId: response.scopeCollegeOrganizationId?.toString(),
        subjectUniversityOrganizationId: response.scopeUniversityOrganizationId?.toString(),
        subjectOrganizationIds: response.scopeOrganizationIds?.map((value) => value.toString()) ?? [],
        stageKinds: [currentStage.kind],
    });

    if (!canReview) {
        throw new AuthError("You are not authorized to review this SSR response.", 403);
    }

    if (currentStage.kind === "review" && !["Forward", "Recommend", "Reject"].includes(input.decision)) {
        throw new AuthError("Use Forward, Recommend, or Reject during review stages.", 400);
    }

    if (currentStage.kind === "final" && !["Approve", "Reject"].includes(input.decision)) {
        throw new AuthError("Use Approve or Reject during final approval.", 400);
    }

    const oldAssignment = assignment.toObject();
    const oldResponse = response.toObject();
    const now = new Date();
    const transition = resolveWorkflowTransition(
        workflowDefinition,
        response.status,
        input.decision === "Reject" ? "reject" : "approve"
    );
    const nextStatus = transition.status as SsrWorkflowStatus;

    assignment.status = nextStatus;
    if (nextStatus === "Approved") {
        assignment.approvedAt = now;
        assignment.approvedBy = new Types.ObjectId(actor.id);
    }
    await assignment.save();

    response.status = nextStatus;
    response.reviewRemarks = input.remarks;
    response.reviewedAt = now;
    if (nextStatus === "Approved") {
        response.approvedAt = now;
        response.approvedBy = new Types.ObjectId(actor.id);
    }
    response.reviewHistory.push({
        reviewerId: new Types.ObjectId(actor.id),
        reviewerName: actor.name,
        reviewerRole: actor.role,
        stage: currentStage.label,
        decision: input.decision,
        remarks: input.remarks,
        reviewedAt: now,
    });
    pushStatusLog(response, nextStatus, actor, input.remarks);
    await response.save();

    await syncWorkflowInstanceState({
        moduleName: "SSR",
        recordId: response._id.toString(),
        status: response.status,
        subjectDepartmentName: response.scopeDepartmentName,
        subjectCollegeName: response.scopeCollegeName,
        subjectUniversityName: response.scopeUniversityName,
        subjectDepartmentId: response.scopeDepartmentId?.toString(),
        subjectInstitutionId: response.scopeInstitutionId?.toString(),
        subjectDepartmentOrganizationId: response.scopeDepartmentOrganizationId?.toString(),
        subjectCollegeOrganizationId: response.scopeCollegeOrganizationId?.toString(),
        subjectUniversityOrganizationId: response.scopeUniversityOrganizationId?.toString(),
        subjectOrganizationIds: response.scopeOrganizationIds?.map((value) => value.toString()) ?? [],
        actor,
        remarks: input.remarks,
        action: input.decision === "Reject" ? "reject" : "approve",
    });

    await createAuditLog({
        actor,
        action:
            input.decision === "Reject"
                ? "SSR_RESPONSE_REJECT"
                : currentStage.kind === "final"
                  ? "SSR_RESPONSE_APPROVE"
                  : "SSR_RESPONSE_REVIEW",
        tableName: "ssr_metric_responses",
        recordId: response._id.toString(),
        oldData: { assignment: oldAssignment, response: oldResponse },
        newData: { assignment: assignment.toObject(), response: response.toObject() },
        auditContext: actor.auditContext,
    });

    return response;
}
