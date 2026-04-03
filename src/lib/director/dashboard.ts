import { Types } from "mongoose";

import {
    buildAuthorizedScopeQuery,
    resolveAuthorizationProfile,
    resolveAuthorizedEvidenceDepartmentIds,
    type AuthorizationActor,
    type AuthorizationProfile,
    type AuthorizationScope,
} from "@/lib/authorization/service";
import { AuthError } from "@/lib/auth/errors";
import dbConnect from "@/lib/dbConnect";
import { getEvidenceDashboardSummary } from "@/lib/evidence/service";
import { listPendingWorkflowRecordIds } from "@/lib/workflow/engine";
import AqarApplication from "@/models/core/aqar-application";
import GovernanceCommitteeMembership from "@/models/core/governance-committee-membership";
import LeadershipAssignment, { type LeadershipAssignmentType } from "@/models/core/leadership-assignment";
import CasApplication from "@/models/core/cas-application";
import FacultyPbasForm from "@/models/core/faculty-pbas-form";
import SsrMetricResponse from "@/models/reporting/ssr-metric-response";
import SsrMetric from "@/models/reporting/ssr-metric";
import CurriculumAssignment from "@/models/academic/curriculum-assignment";
import CurriculumCourse from "@/models/academic/curriculum-course";
import CurriculumPlan from "@/models/academic/curriculum-plan";
import TeachingLearningAssignment from "@/models/academic/teaching-learning-assignment";
import TeachingLearningPlan from "@/models/academic/teaching-learning-plan";
import Program from "@/models/academic/program";
import Department from "@/models/reference/department";
import Faculty from "@/models/faculty/faculty";
import InfrastructureLibraryAssignment from "@/models/operations/infrastructure-library-assignment";
import InfrastructureLibraryPlan from "@/models/operations/infrastructure-library-plan";
import ResearchInnovationAssignment from "@/models/research/research-innovation-assignment";
import ResearchInnovationPlan from "@/models/research/research-innovation-plan";
import StudentSupportGovernanceAssignment from "@/models/student/student-support-governance-assignment";
import StudentSupportGovernancePlan from "@/models/student/student-support-governance-plan";
import Internship from "@/models/student/internship";
import Placement from "@/models/student/placement";
import StudentAcademicRecord from "@/models/student/student-academic-record";
import StudentAward from "@/models/student/student-award";
import StudentCulturalParticipation from "@/models/student/student-cultural-participation";
import StudentEventParticipation from "@/models/student/student-event-participation";
import Student from "@/models/student/student";
import StudentPublication from "@/models/student/student-publication";
import StudentResearchProject from "@/models/student/student-research-project";
import StudentSkill from "@/models/student/student-skill";
import StudentSocialParticipation from "@/models/student/student-social-participation";
import StudentSport from "@/models/student/student-sport";
import User from "@/models/core/user";
import "@/models/reference/award";
import "@/models/reference/cultural-activity";
import "@/models/reference/document";
import "@/models/reference/event";
import "@/models/reference/semester";
import "@/models/reference/skill";
import "@/models/reference/social-program";
import "@/models/reference/sport";

type LeadershipDashboardActor = AuthorizationActor;

type LeadershipQueueItem = {
    id: string;
    moduleName:
        | "PBAS"
        | "CAS"
        | "AQAR"
        | "SSR"
        | "CURRICULUM"
        | "TEACHING_LEARNING"
        | "RESEARCH_INNOVATION"
        | "INFRASTRUCTURE_LIBRARY"
        | "STUDENT_SUPPORT_GOVERNANCE";
    title: string;
    subtitle: string;
    status: string;
    actionLabel: string;
    href: string;
    updatedAt?: string;
};

type LeadershipModuleSummary = {
    total: number;
    actionable: number;
    finalApprovals: number;
    approved: number;
    rejected: number;
    draft: number;
};

export type LeadershipFacultyRow = {
    facultyId: string;
    facultyName: string;
    employeeCode: string;
    designation: string;
    photoURL?: string;
    email?: string;
    mobile?: string;
    employmentType?: string;
    highestQualification?: string;
    experienceYears?: number;
    accountStatus?: string;
    lastLoginAt?: string;
    departmentId?: string;
    departmentName?: string;
    institutionName?: string;
    status: string;
    pbasStatus?: string;
    pbasAcademicYear?: string;
    casStatus?: string;
    casApplicationYear?: string;
    aqarStatus?: string;
    aqarAcademicYear?: string;
    needsAttention: boolean;
};

export type LeadershipStudentRow = {
    studentId: string;
    studentName: string;
    enrollmentNo: string;
    photoURL?: string;
    email?: string;
    mobile?: string;
    departmentId?: string;
    departmentName?: string;
    programId?: string;
    programName?: string;
    institutionName?: string;
    admissionYear: number;
    status: string;
    gender?: string;
    dob?: string;
    address?: string;
    accountStatus?: string;
    lastLoginAt?: string;
};

type LeadershipStudentRecordDocument = {
    fileName?: string;
    fileUrl?: string;
    verificationStatus?: string;
};

export type LeadershipFacultyRecordsData = {
    summary: {
        pbas: number;
        cas: number;
        aqar: number;
        pending: number;
        approved: number;
        rejected: number;
        total: number;
    };
    pbas: Array<{
        id: string;
        academicYear: string;
        status: string;
        submissionStatus: string;
        submittedAt?: string;
        updatedAt?: string;
        reviewCount: number;
    }>;
    cas: Array<{
        id: string;
        applicationYear: string;
        currentDesignation: string;
        applyingForDesignation: string;
        status: string;
        apiScore?: number;
        experienceYears?: number;
        submittedAt?: string;
        updatedAt?: string;
    }>;
    aqar: Array<{
        id: string;
        academicYear: string;
        status: string;
        contributionIndex?: number;
        researchPaperCount?: number;
        patentCount?: number;
        submittedAt?: string;
        updatedAt?: string;
    }>;
};

export type LeadershipStudentRecordsData = {
    summary: {
        academics: number;
        publications: number;
        researchProjects: number;
        awards: number;
        skills: number;
        sports: number;
        cultural: number;
        events: number;
        social: number;
        internships: number;
        placements: number;
        total: number;
    };
    academics: Array<{
        id: string;
        semester: string;
        sgpa?: number;
        cgpa?: number;
        percentage?: number;
        rank?: number;
        resultStatus?: string;
    }>;
    publications: Array<{
        id: string;
        title: string;
        publicationType?: string;
        journalName?: string;
        publisher?: string;
        publicationDate?: string;
        doi?: string;
        indexedIn?: string;
        document?: LeadershipStudentRecordDocument;
    }>;
    researchProjects: Array<{
        id: string;
        title: string;
        guideName?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
        document?: LeadershipStudentRecordDocument;
    }>;
    awards: Array<{
        id: string;
        title: string;
        category?: string;
        level?: string;
        organizingBody?: string;
        awardDate?: string;
        document?: LeadershipStudentRecordDocument;
    }>;
    skills: Array<{
        id: string;
        name: string;
        category?: string;
        provider?: string;
        startDate?: string;
        endDate?: string;
        document?: LeadershipStudentRecordDocument;
    }>;
    sports: Array<{
        id: string;
        sportName: string;
        eventName: string;
        level?: string;
        position?: string;
        eventDate?: string;
        document?: LeadershipStudentRecordDocument;
    }>;
    cultural: Array<{
        id: string;
        activityName: string;
        category?: string;
        eventName: string;
        level?: string;
        position?: string;
        date?: string;
        document?: LeadershipStudentRecordDocument;
    }>;
    events: Array<{
        id: string;
        title: string;
        eventType?: string;
        organizedBy?: string;
        role: string;
        paperTitle?: string;
        eventDate?: string;
        document?: LeadershipStudentRecordDocument;
    }>;
    social: Array<{
        id: string;
        programName: string;
        programType?: string;
        activityName: string;
        hoursContributed?: number;
        date?: string;
        document?: LeadershipStudentRecordDocument;
    }>;
    internships: Array<{
        id: string;
        companyName: string;
        role?: string;
        startDate?: string;
        endDate?: string;
        stipend?: number;
        document?: LeadershipStudentRecordDocument;
    }>;
    placements: Array<{
        id: string;
        companyName: string;
        jobRole?: string;
        package?: number;
        offerDate?: string;
        joiningDate?: string;
    }>;
};

type LeadershipDepartmentRow = {
    departmentId: string;
    departmentName: string;
    facultyCount: number;
    pbasPending: number;
    casPending: number;
    aqarPending: number;
    evidencePending: number;
};

export type LeadershipDashboardData = {
    access: {
        displayRole: string;
        roleLabels: string[];
        scopeCount: number;
    };
    metrics: {
        facultyCount: number;
        departmentCount: number;
        activeAssignments: number;
        activeCommittees: number;
        actionableItems: number;
        evidencePending: number;
        staleEvidence: number;
    };
    assignments: Array<{
        assignmentType: LeadershipAssignmentType;
        title?: string;
        organizationName: string;
        organizationType: string;
        collegeName?: string;
        universityName?: string;
    }>;
    committees: Array<{
        name: string;
        committeeType?: string;
        organizationName?: string;
        memberRole: string;
    }>;
    scopes: Array<{
        label: string;
        scopeType: string;
        organizationName?: string;
    }>;
    modules: Record<
        | "PBAS"
        | "CAS"
        | "AQAR"
        | "SSR"
        | "CURRICULUM"
        | "TEACHING_LEARNING"
        | "RESEARCH_INNOVATION"
        | "INFRASTRUCTURE_LIBRARY"
        | "STUDENT_SUPPORT_GOVERNANCE",
        LeadershipModuleSummary
    >;
    queue: {
        totalActionable: number;
        reviewCount: number;
        finalCount: number;
        items: LeadershipQueueItem[];
    };
    facultyRoster: LeadershipFacultyRow[];
    departmentBreakdown: LeadershipDepartmentRow[];
};

function uniqueStrings(values: Array<string | undefined | null>) {
    return Array.from(
        new Set(
            values
                .map((value) => String(value ?? "").trim())
                .filter(Boolean)
        )
    );
}

function createScopeLabel(scope: AuthorizationScope) {
    const unit = scope.organizationName ?? scope.collegeName ?? scope.universityName ?? "Assigned scope";
    const type =
        scope.sourceType === "LEGACY_HEAD"
            ? "Legacy head mapping"
            : String(scope.sourceType ?? scope.organizationType ?? scope.source);

    return {
        label: unit,
        scopeType: type.replaceAll("_", " "),
        organizationName: scope.organizationName,
    };
}

function assignmentPriority(label: string) {
    const order = ["HOD", "PRINCIPAL", "IQAC_COORDINATOR", "DIRECTOR", "OFFICE_HEAD"];
    const index = order.indexOf(label);
    return index === -1 ? order.length : index;
}

function formatDisplayRole(profile: AuthorizationProfile, assignments: LeadershipDashboardData["assignments"]) {
    const roleLabels = uniqueStrings([
        ...assignments.map((assignment) => assignment.assignmentType),
        ...profile.workflowRoles.map((role) => role.replaceAll("_", " ")),
    ]);

    const displayRole = roleLabels.sort((left, right) => assignmentPriority(left) - assignmentPriority(right))[0] ??
        "Leadership";

    return {
        displayRole: displayRole.replaceAll("_", " "),
        roleLabels: roleLabels.map((label) => label.replaceAll("_", " ")),
    };
}

function toObjectIdArray(ids: string[]) {
    return ids
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
}

function indexLatestRecord<T extends { facultyId?: Types.ObjectId; updatedAt?: Date }>(
    rows: T[]
) {
    const latest = new Map<string, T>();

    for (const row of rows) {
        const facultyId = row.facultyId?.toString();
        if (!facultyId || latest.has(facultyId)) {
            continue;
        }

        latest.set(facultyId, row);
    }

    return latest;
}

function isPendingStatus(status?: string) {
    return status === "Submitted" || status === "Under Review" || status === "Committee Review";
}

function formatQueueDate(value?: Date) {
    if (!value) {
        return undefined;
    }

    return new Date(value).toISOString();
}

function mapDocumentRef(document: unknown): LeadershipStudentRecordDocument | undefined {
    if (!document || typeof document !== "object") {
        return undefined;
    }

    const doc = document as {
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
    };

    return {
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        verificationStatus: doc.verificationStatus,
    };
}

async function loadAssignments(actorId: string) {
    return LeadershipAssignment.find({
        userId: new Types.ObjectId(actorId),
        isActive: true,
        $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: new Date() } }],
    })
        .select("assignmentType title organizationName organizationType collegeName universityName")
        .lean();
}

async function loadCommittees(actorId: string) {
    const memberships = await GovernanceCommitteeMembership.find({
        userId: new Types.ObjectId(actorId),
        isActive: true,
        $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: new Date() } }],
    })
        .populate("committeeId", "name committeeType organizationName")
        .select("memberRole")
        .lean();

    return memberships
        .map((membership) => {
            const committee = membership.committeeId as {
                name?: string;
                committeeType?: string;
                organizationName?: string;
            } | null;

            if (!committee?.name) {
                return null;
            }

            return {
                name: committee.name,
                committeeType: committee.committeeType,
                organizationName: committee.organizationName,
                memberRole: membership.memberRole,
            };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

async function loadFacultyRoster(
    departmentIds: string[],
    departmentNameById: Map<string, string>,
    institutionNameByDepartmentId: Map<string, string | undefined>
) {
    const faculty = await Faculty.find({
        departmentId: { $in: toObjectIdArray(departmentIds) },
    })
        .select(
            "userId employeeCode firstName lastName designation departmentId status mobile employmentType highestQualification experienceYears"
        )
        .sort({ firstName: 1, lastName: 1 })
        .lean();

    const userIds = faculty
        .map((row) => row.userId?.toString())
        .filter((value): value is string => Boolean(value));

    const [users, pbasRows, casRows, aqarRows] = await Promise.all([
        User.find({ _id: { $in: toObjectIdArray(userIds) } })
            .select("email phone photoURL accountStatus lastLoginAt")
            .lean(),
        FacultyPbasForm.find({ facultyId: { $in: faculty.map((row) => row._id) } })
            .select("facultyId academicYear status updatedAt")
            .sort({ facultyId: 1, updatedAt: -1 })
            .lean(),
        CasApplication.find({ facultyId: { $in: faculty.map((row) => row._id) } })
            .select("facultyId applicationYear status updatedAt")
            .sort({ facultyId: 1, updatedAt: -1 })
            .lean(),
        AqarApplication.find({ facultyId: { $in: faculty.map((row) => row._id) } })
            .select("facultyId academicYear status updatedAt")
            .sort({ facultyId: 1, updatedAt: -1 })
            .lean(),
    ]);

    const userById = new Map(
        users.map((user) => [
            user._id.toString(),
            {
                email: user.email,
                phone: user.phone,
                photoURL: user.photoURL,
                accountStatus: user.accountStatus,
                lastLoginAt: formatQueueDate(user.lastLoginAt),
            },
        ])
    );
    const latestPbas = indexLatestRecord(pbasRows);
    const latestCas = indexLatestRecord(casRows);
    const latestAqar = indexLatestRecord(aqarRows);

    return faculty.map((row) => {
        const facultyId = row._id.toString();
        const pbas = latestPbas.get(facultyId);
        const cas = latestCas.get(facultyId);
        const aqar = latestAqar.get(facultyId);
        const facultyName = [row.firstName, row.lastName].filter(Boolean).join(" ");
        const departmentId = row.departmentId?.toString();
        const userSnapshot = row.userId ? userById.get(row.userId.toString()) : undefined;

        return {
            facultyId,
            facultyName,
            employeeCode: row.employeeCode,
            designation: row.designation,
            photoURL: userSnapshot?.photoURL,
            email: userSnapshot?.email,
            mobile: row.mobile ?? userSnapshot?.phone,
            employmentType: row.employmentType,
            highestQualification: row.highestQualification,
            experienceYears: row.experienceYears,
            accountStatus: userSnapshot?.accountStatus,
            lastLoginAt: userSnapshot?.lastLoginAt,
            departmentId,
            departmentName: departmentId ? departmentNameById.get(departmentId) : undefined,
            institutionName: departmentId ? institutionNameByDepartmentId.get(departmentId) : undefined,
            status: row.status,
            pbasStatus: pbas?.status,
            pbasAcademicYear: pbas?.academicYear,
            casStatus: cas?.status,
            casApplicationYear: cas?.applicationYear,
            aqarStatus: aqar?.status,
            aqarAcademicYear: aqar?.academicYear,
            needsAttention: [pbas?.status, cas?.status, aqar?.status].some((status) => isPendingStatus(status)),
        };
    });
}

async function loadStudentRoster(
    departmentIds: string[],
    departmentNameById: Map<string, string>,
    institutionNameByDepartmentId: Map<string, string | undefined>
): Promise<LeadershipStudentRow[]> {
    const students = await Student.find({
        departmentId: { $in: toObjectIdArray(departmentIds) },
    })
        .select(
            "userId enrollmentNo firstName lastName email mobile departmentId programId admissionYear status gender dob address"
        )
        .sort({ firstName: 1, lastName: 1, enrollmentNo: 1 })
        .lean();

    const userIds = uniqueStrings(
        students.map((row) => row.userId?.toString())
    );
    const programIds = uniqueStrings(
        students.map((row) => row.programId?.toString())
    );

    const [users, programs] = await Promise.all([
        User.find({ _id: { $in: toObjectIdArray(userIds) } })
            .select("email phone photoURL accountStatus lastLoginAt")
            .lean(),
        Program.find({ _id: { $in: toObjectIdArray(programIds) } })
            .select("name")
            .lean(),
    ]);

    const userById = new Map(
        users.map((user) => [
            user._id.toString(),
            {
                email: user.email,
                phone: user.phone,
                photoURL: user.photoURL,
                accountStatus: user.accountStatus,
                lastLoginAt: formatQueueDate(user.lastLoginAt),
            },
        ])
    );
    const programNameById = new Map(
        programs.map((program) => [program._id.toString(), program.name])
    );

    return students.map((row) => {
        const studentId = row._id.toString();
        const studentName = [row.firstName, row.lastName].filter(Boolean).join(" ") || row.enrollmentNo;
        const departmentId = row.departmentId?.toString();
        const programId = row.programId?.toString();
        const userSnapshot = row.userId ? userById.get(row.userId.toString()) : undefined;

        return {
            studentId,
            studentName,
            enrollmentNo: row.enrollmentNo,
            photoURL: userSnapshot?.photoURL,
            email: row.email ?? userSnapshot?.email,
            mobile: row.mobile ?? userSnapshot?.phone,
            departmentId,
            departmentName: departmentId ? departmentNameById.get(departmentId) : undefined,
            programId,
            programName: programId ? programNameById.get(programId) : undefined,
            institutionName: departmentId ? institutionNameByDepartmentId.get(departmentId) : undefined,
            admissionYear: row.admissionYear,
            status: row.status,
            gender: row.gender,
            dob: row.dob ? row.dob.toISOString() : undefined,
            address: row.address,
            accountStatus: userSnapshot?.accountStatus,
            lastLoginAt: userSnapshot?.lastLoginAt,
        };
    });
}

async function loadDepartmentBreakdown(
    departmentIds: string[],
    departmentNameById: Map<string, string>,
    facultyRoster: LeadershipFacultyRow[],
    evidenceSummary: Awaited<ReturnType<typeof getEvidenceDashboardSummary>>
) {
    const [pbasRows, casRows, aqarRows] = await Promise.all([
        FacultyPbasForm.find({
            scopeDepartmentId: { $in: toObjectIdArray(departmentIds) },
            status: { $in: ["Submitted", "Under Review", "Committee Review"] },
        })
            .select("scopeDepartmentId")
            .lean(),
        CasApplication.find({
            scopeDepartmentId: { $in: toObjectIdArray(departmentIds) },
            status: { $in: ["Submitted", "Under Review", "Committee Review"] },
        })
            .select("scopeDepartmentId")
            .lean(),
        AqarApplication.find({
            scopeDepartmentId: { $in: toObjectIdArray(departmentIds) },
            status: { $in: ["Submitted", "Under Review", "Committee Review"] },
        })
            .select("scopeDepartmentId")
            .lean(),
    ]);

    const facultyCountByDepartment = new Map<string, number>();
    for (const row of facultyRoster) {
        const departmentId = row.departmentId;
        if (!departmentId) {
            continue;
        }
        facultyCountByDepartment.set(departmentId, (facultyCountByDepartment.get(departmentId) ?? 0) + 1);
    }

    const countByDepartment = (rows: Array<{ scopeDepartmentId?: Types.ObjectId | null }>) => {
        const map = new Map<string, number>();
        for (const row of rows) {
            const departmentId = row.scopeDepartmentId?.toString();
            if (!departmentId) {
                continue;
            }

            map.set(departmentId, (map.get(departmentId) ?? 0) + 1);
        }
        return map;
    };

    const pbasPending = countByDepartment(pbasRows);
    const casPending = countByDepartment(casRows);
    const aqarPending = countByDepartment(aqarRows);
    const evidencePendingByName = new Map(
        evidenceSummary.departmentBreakdown.map((row) => [row.label, row.pendingCount])
    );

    return departmentIds
        .map((departmentId) => {
            const departmentName = departmentNameById.get(departmentId) ?? "Department";
            return {
                departmentId,
                departmentName,
                facultyCount: facultyCountByDepartment.get(departmentId) ?? 0,
                pbasPending: pbasPending.get(departmentId) ?? 0,
                casPending: casPending.get(departmentId) ?? 0,
                aqarPending: aqarPending.get(departmentId) ?? 0,
                evidencePending: evidencePendingByName.get(departmentName) ?? 0,
            };
        })
        .sort(
            (left, right) =>
                right.pbasPending +
                    right.casPending +
                    right.aqarPending +
                    right.evidencePending -
                (left.pbasPending +
                    left.casPending +
                    left.aqarPending +
                    left.evidencePending) ||
                left.departmentName.localeCompare(right.departmentName)
        );
}

export async function getLeadershipDashboardData(
    actor: LeadershipDashboardActor
): Promise<LeadershipDashboardData> {
    await dbConnect();

    const profile = await resolveAuthorizationProfile(actor);
    const [assignments, committees, evidenceSummary] = await Promise.all([
        loadAssignments(actor.id),
        loadCommittees(actor.id),
        getEvidenceDashboardSummary(actor).catch(() => ({
            totalItems: 0,
            pendingCount: 0,
            verifiedCount: 0,
            rejectedCount: 0,
            departmentCount: 0,
            recentUploadsCount: 0,
            stalePendingCount: 0,
            recordTypeBreakdown: [],
            departmentBreakdown: [],
        })),
    ]);

    const [
        departmentIds,
        pbasRecords,
        casRecords,
        aqarRecords,
        ssrRecords,
        curriculumRecords,
        teachingLearningRecords,
        infrastructureLibraryRecords,
        studentSupportGovernanceRecords,
        researchInnovationRecords,
        pbasReviewIds,
        pbasFinalIds,
        casReviewIds,
        casFinalIds,
        aqarReviewIds,
        aqarFinalIds,
        ssrReviewIds,
        ssrFinalIds,
        curriculumReviewIds,
        curriculumFinalIds,
        teachingLearningReviewIds,
        teachingLearningFinalIds,
        infrastructureLibraryReviewIds,
        infrastructureLibraryFinalIds,
        studentSupportGovernanceReviewIds,
        studentSupportGovernanceFinalIds,
        researchInnovationReviewIds,
        researchInnovationFinalIds,
    ] =
        await Promise.all([
            resolveAuthorizedEvidenceDepartmentIds(profile),
            FacultyPbasForm.find(buildAuthorizedScopeQuery(profile))
                .select("_id facultyId academicYear status updatedAt")
                .sort({ updatedAt: -1 })
                .lean(),
            CasApplication.find(buildAuthorizedScopeQuery(profile))
                .select("_id facultyId applicationYear currentDesignation applyingForDesignation status updatedAt")
                .sort({ updatedAt: -1 })
                .lean(),
            AqarApplication.find(buildAuthorizedScopeQuery(profile))
                .select("_id facultyId academicYear status updatedAt")
                .sort({ updatedAt: -1 })
                .lean(),
            SsrMetricResponse.find(buildAuthorizedScopeQuery(profile))
                .select("_id contributorUserId metricId status updatedAt")
                .sort({ updatedAt: -1 })
                .lean(),
            CurriculumAssignment.find(buildAuthorizedScopeQuery(profile))
                .select("_id curriculumId curriculumCourseId status updatedAt")
                .sort({ updatedAt: -1 })
                .lean(),
            TeachingLearningAssignment.find(buildAuthorizedScopeQuery(profile))
                .select("_id planId status updatedAt")
                .sort({ updatedAt: -1 })
                .lean(),
            InfrastructureLibraryAssignment.find(buildAuthorizedScopeQuery(profile))
                .select("_id planId status updatedAt")
                .sort({ updatedAt: -1 })
                .lean(),
            StudentSupportGovernanceAssignment.find(buildAuthorizedScopeQuery(profile))
                .select("_id planId status updatedAt")
                .sort({ updatedAt: -1 })
                .lean(),
            ResearchInnovationAssignment.find(buildAuthorizedScopeQuery(profile))
                .select("_id planId status updatedAt")
                .sort({ updatedAt: -1 })
                .lean(),
            listPendingWorkflowRecordIds({ actor, moduleName: "PBAS", stageKinds: ["review"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "PBAS", stageKinds: ["final"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "CAS", stageKinds: ["review"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "CAS", stageKinds: ["final"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "AQAR", stageKinds: ["review"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "AQAR", stageKinds: ["final"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "SSR", stageKinds: ["review"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "SSR", stageKinds: ["final"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "CURRICULUM", stageKinds: ["review"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "CURRICULUM", stageKinds: ["final"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "TEACHING_LEARNING", stageKinds: ["review"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "TEACHING_LEARNING", stageKinds: ["final"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "INFRASTRUCTURE_LIBRARY", stageKinds: ["review"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "INFRASTRUCTURE_LIBRARY", stageKinds: ["final"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "STUDENT_SUPPORT_GOVERNANCE", stageKinds: ["review"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "STUDENT_SUPPORT_GOVERNANCE", stageKinds: ["final"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "RESEARCH_INNOVATION", stageKinds: ["review"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "RESEARCH_INNOVATION", stageKinds: ["final"] }),
        ]);

    const departments = await Department.find({ _id: { $in: toObjectIdArray(departmentIds) } })
        .populate("institutionId", "name")
        .select("_id name institutionId")
        .lean();

    const departmentNameById = new Map(departments.map((row) => [row._id.toString(), row.name]));
    const institutionNameByDepartmentId = new Map(
        departments.map((row) => [
            row._id.toString(),
            typeof row.institutionId === "object" && row.institutionId && "name" in row.institutionId
                ? String(row.institutionId.name)
                : undefined,
        ])
    );

    const facultyRoster = await loadFacultyRoster(
        departmentIds,
        departmentNameById,
        institutionNameByDepartmentId
    );

    const facultyNameById = new Map(facultyRoster.map((row) => [row.facultyId, row.facultyName]));
    const [
        ssrMetrics,
        ssrContributors,
        curriculumPlans,
        curriculumCourses,
        teachingLearningPlans,
        infrastructureLibraryPlans,
        studentSupportGovernancePlans,
        researchInnovationPlans,
    ] = await Promise.all([
        SsrMetric.find({
            _id: {
                $in: uniqueStrings(ssrRecords.map((row) => row.metricId?.toString())).map(
                    (value) => new Types.ObjectId(value)
                ),
            },
        })
            .select("metricCode title")
            .lean(),
        User.find({
            _id: {
                $in: uniqueStrings(ssrRecords.map((row) => row.contributorUserId?.toString())).map(
                    (value) => new Types.ObjectId(value)
                ),
            },
        })
            .select("name")
            .lean(),
        CurriculumPlan.find({
            _id: {
                $in: uniqueStrings(curriculumRecords.map((row) => row.curriculumId?.toString())).map(
                    (value) => new Types.ObjectId(value)
                ),
            },
        })
            .select("title regulationYear")
            .lean(),
        CurriculumCourse.find({
            _id: {
                $in: uniqueStrings(curriculumRecords.map((row) => row.curriculumCourseId?.toString())).map(
                    (value) => new Types.ObjectId(value)
                ),
            },
        })
            .select("courseCode courseTitle")
            .lean(),
        TeachingLearningPlan.find({
            _id: {
                $in: uniqueStrings(teachingLearningRecords.map((row) => row.planId?.toString())).map(
                    (value) => new Types.ObjectId(value)
                ),
            },
        })
            .populate("courseId", "name subjectCode")
            .select("title courseId")
            .lean(),
        InfrastructureLibraryPlan.find({
            _id: {
                $in: uniqueStrings(infrastructureLibraryRecords.map((row) => row.planId?.toString())).map(
                    (value) => new Types.ObjectId(value)
                ),
            },
        })
            .populate("academicYearId", "yearStart yearEnd")
            .populate("institutionId", "name")
            .populate("departmentId", "name")
            .select("title focusArea scopeType academicYearId institutionId departmentId")
            .lean(),
        StudentSupportGovernancePlan.find({
            _id: {
                $in: uniqueStrings(
                    studentSupportGovernanceRecords.map((row) => row.planId?.toString())
                ).map((value) => new Types.ObjectId(value)),
            },
        })
            .populate("academicYearId", "yearStart yearEnd")
            .populate("institutionId", "name")
            .populate("departmentId", "name")
            .select("title focusArea scopeType academicYearId institutionId departmentId")
            .lean(),
        ResearchInnovationPlan.find({
            _id: {
                $in: uniqueStrings(researchInnovationRecords.map((row) => row.planId?.toString())).map(
                    (value) => new Types.ObjectId(value)
                ),
            },
        })
            .populate("academicYearId", "yearStart yearEnd")
            .populate("institutionId", "name")
            .populate("departmentId", "name")
            .select("title focusArea scopeType academicYearId institutionId departmentId")
            .lean(),
    ]);

    const pbasFinalIdSet = new Set(pbasFinalIds);
    const casFinalIdSet = new Set(casFinalIds);
    const aqarFinalIdSet = new Set(aqarFinalIds);
    const ssrFinalIdSet = new Set(ssrFinalIds);
    const curriculumFinalIdSet = new Set(curriculumFinalIds);
    const teachingLearningFinalIdSet = new Set(teachingLearningFinalIds);
    const infrastructureLibraryFinalIdSet = new Set(infrastructureLibraryFinalIds);
    const studentSupportGovernanceFinalIdSet = new Set(studentSupportGovernanceFinalIds);
    const researchInnovationFinalIdSet = new Set(researchInnovationFinalIds);
    const ssrMetricById = new Map(ssrMetrics.map((row) => [row._id.toString(), row]));
    const ssrContributorNameById = new Map(
        ssrContributors.map((row) => [row._id.toString(), row.name])
    );
    const curriculumPlanById = new Map(
        curriculumPlans.map((row) => [row._id.toString(), row])
    );
    const curriculumCourseById = new Map(
        curriculumCourses.map((row) => [row._id.toString(), row])
    );
    const teachingLearningPlanById = new Map(
        teachingLearningPlans.map((row) => [row._id.toString(), row])
    );
    const infrastructureLibraryPlanById = new Map(
        infrastructureLibraryPlans.map((row) => [row._id.toString(), row])
    );
    const studentSupportGovernancePlanById = new Map(
        studentSupportGovernancePlans.map((row) => [row._id.toString(), row])
    );
    const researchInnovationPlanById = new Map(
        researchInnovationPlans.map((row) => [row._id.toString(), row])
    );

    const queueItems: LeadershipQueueItem[] = [
        ...pbasRecords
            .filter((row) => pbasReviewIds.includes(row._id.toString()) || pbasFinalIdSet.has(row._id.toString()))
            .slice(0, 6)
            .map((row) => ({
                id: row._id.toString(),
                moduleName: "PBAS" as const,
                title: facultyNameById.get(row.facultyId.toString()) ?? "Faculty PBAS record",
                subtitle: row.academicYear,
                status: row.status,
                actionLabel: pbasFinalIdSet.has(row._id.toString()) ? "Final approval" : "Review required",
                href: "/director/pbas",
                updatedAt: formatQueueDate(row.updatedAt),
            })),
        ...casRecords
            .filter((row) => casReviewIds.includes(row._id.toString()) || casFinalIdSet.has(row._id.toString()))
            .slice(0, 6)
            .map((row) => ({
                id: row._id.toString(),
                moduleName: "CAS" as const,
                title: facultyNameById.get(row.facultyId.toString()) ?? "Faculty CAS record",
                subtitle: `${row.currentDesignation} to ${row.applyingForDesignation}`,
                status: row.status,
                actionLabel: casFinalIdSet.has(row._id.toString()) ? "Final approval" : "Review required",
                href: "/director/cas",
                updatedAt: formatQueueDate(row.updatedAt),
            })),
        ...aqarRecords
            .filter((row) => aqarReviewIds.includes(row._id.toString()) || aqarFinalIdSet.has(row._id.toString()))
            .slice(0, 6)
            .map((row) => ({
                id: row._id.toString(),
                moduleName: "AQAR" as const,
                title: facultyNameById.get(row.facultyId.toString()) ?? "Faculty AQAR record",
                subtitle: row.academicYear,
                status: row.status,
                actionLabel: aqarFinalIdSet.has(row._id.toString()) ? "Final approval" : "Review required",
                href: "/director/aqar",
                updatedAt: formatQueueDate(row.updatedAt),
            })),
        ...ssrRecords
            .filter((row) => ssrReviewIds.includes(row._id.toString()) || ssrFinalIdSet.has(row._id.toString()))
            .slice(0, 6)
            .map((row) => {
                const metric = ssrMetricById.get(row.metricId.toString());
                return {
                    id: row._id.toString(),
                    moduleName: "SSR" as const,
                    title: metric?.title ?? "SSR metric response",
                    subtitle: `${metric?.metricCode ?? "Metric"} • ${
                        ssrContributorNameById.get(row.contributorUserId.toString()) ?? "Contributor"
                    }`,
                    status: row.status,
                    actionLabel: ssrFinalIdSet.has(row._id.toString()) ? "Final approval" : "Review required",
                    href: "/director/ssr",
                    updatedAt: formatQueueDate(row.updatedAt),
                };
            }),
        ...curriculumRecords
            .filter(
                (row) =>
                    curriculumReviewIds.includes(row._id.toString()) ||
                    curriculumFinalIdSet.has(row._id.toString())
            )
            .slice(0, 6)
            .map((row) => {
                const plan = curriculumPlanById.get(row.curriculumId.toString());
                const course = curriculumCourseById.get(row.curriculumCourseId.toString());

                return {
                    id: row._id.toString(),
                    moduleName: "CURRICULUM" as const,
                    title: course?.courseTitle ?? "Curriculum course draft",
                    subtitle: `${course?.courseCode ?? "Course"} · ${plan?.title ?? "Curriculum"}`,
                    status: row.status,
                    actionLabel: curriculumFinalIdSet.has(row._id.toString())
                        ? "Final approval"
                        : "Review required",
                    href: "/director/curriculum",
                    updatedAt: formatQueueDate(row.updatedAt),
                };
            }),
        ...teachingLearningRecords
            .filter(
                (row) =>
                    teachingLearningReviewIds.includes(row._id.toString()) ||
                    teachingLearningFinalIdSet.has(row._id.toString())
            )
            .slice(0, 6)
            .map((row) => {
                const plan = teachingLearningPlanById.get(row.planId.toString());
                const course =
                    plan?.courseId && typeof plan.courseId === "object" && "name" in plan.courseId
                        ? (plan.courseId as { name?: string; subjectCode?: string })
                        : null;

                return {
                    id: row._id.toString(),
                    moduleName: "TEACHING_LEARNING" as const,
                    title: plan?.title ?? "Teaching learning record",
                    subtitle: `${course?.subjectCode ?? "Course"} · ${course?.name ?? "Delivery plan"}`,
                    status: row.status,
                    actionLabel: teachingLearningFinalIdSet.has(row._id.toString())
                        ? "Final approval"
                        : "Review required",
                    href: "/director/teaching-learning",
                    updatedAt: formatQueueDate(row.updatedAt),
                };
            }),
        ...infrastructureLibraryRecords
            .filter(
                (row) =>
                    infrastructureLibraryReviewIds.includes(row._id.toString()) ||
                    infrastructureLibraryFinalIdSet.has(row._id.toString())
            )
            .slice(0, 6)
            .map((row) => {
                const plan = infrastructureLibraryPlanById.get(row.planId.toString());
                const academicYearRef =
                    plan?.academicYearId &&
                    typeof plan.academicYearId === "object" &&
                    "yearStart" in plan.academicYearId
                        ? (plan.academicYearId as { yearStart?: number; yearEnd?: number })
                        : undefined;
                const academicYear =
                    academicYearRef?.yearStart && academicYearRef?.yearEnd
                        ? `${academicYearRef.yearStart}-${academicYearRef.yearEnd}`
                        : "Academic year";
                const unit =
                    plan?.scopeType === "Department"
                        ? typeof plan.departmentId === "object" && plan.departmentId && "name" in plan.departmentId
                            ? String(plan.departmentId.name)
                            : "Department"
                        : typeof plan?.institutionId === "object" &&
                            plan.institutionId &&
                            "name" in plan.institutionId
                          ? String(plan.institutionId.name)
                          : "Institution";

                return {
                    id: row._id.toString(),
                    moduleName: "INFRASTRUCTURE_LIBRARY" as const,
                    title: plan?.title ?? "Infrastructure & library record",
                    subtitle: `${plan?.focusArea ?? "Integrated"} · ${unit} · ${academicYear}`,
                    status: row.status,
                    actionLabel: infrastructureLibraryFinalIdSet.has(row._id.toString())
                        ? "Final approval"
                        : "Review required",
                    href: "/director/infrastructure-library",
                    updatedAt: formatQueueDate(row.updatedAt),
                };
            }),
        ...studentSupportGovernanceRecords
            .filter(
                (row) =>
                    studentSupportGovernanceReviewIds.includes(row._id.toString()) ||
                    studentSupportGovernanceFinalIdSet.has(row._id.toString())
            )
            .slice(0, 6)
            .map((row) => {
                const plan = studentSupportGovernancePlanById.get(row.planId.toString());
                const academicYearRef =
                    plan?.academicYearId &&
                    typeof plan.academicYearId === "object" &&
                    "yearStart" in plan.academicYearId
                        ? (plan.academicYearId as { yearStart?: number; yearEnd?: number })
                        : undefined;
                const academicYear =
                    academicYearRef?.yearStart && academicYearRef?.yearEnd
                        ? `${academicYearRef.yearStart}-${academicYearRef.yearEnd}`
                        : "Academic year";
                const unit =
                    plan?.scopeType === "Department"
                        ? typeof plan.departmentId === "object" && plan.departmentId && "name" in plan.departmentId
                            ? String(plan.departmentId.name)
                            : "Department"
                        : typeof plan?.institutionId === "object" &&
                            plan.institutionId &&
                            "name" in plan.institutionId
                          ? String(plan.institutionId.name)
                          : "Institution";

                return {
                    id: row._id.toString(),
                    moduleName: "STUDENT_SUPPORT_GOVERNANCE" as const,
                    title: plan?.title ?? "Student support record",
                    subtitle: `${plan?.focusArea ?? "Integrated"} · ${unit} · ${academicYear}`,
                    status: row.status,
                    actionLabel: studentSupportGovernanceFinalIdSet.has(row._id.toString())
                        ? "Final approval"
                        : "Review required",
                    href: "/director/student-support-governance",
                    updatedAt: formatQueueDate(row.updatedAt),
                };
            }),
        ...researchInnovationRecords
            .filter(
                (row) =>
                    researchInnovationReviewIds.includes(row._id.toString()) ||
                    researchInnovationFinalIdSet.has(row._id.toString())
            )
            .slice(0, 6)
            .map((row) => {
                const plan = researchInnovationPlanById.get(row.planId.toString());
                const academicYearRef =
                    plan?.academicYearId &&
                    typeof plan.academicYearId === "object" &&
                    "yearStart" in plan.academicYearId
                        ? (plan.academicYearId as { yearStart?: number; yearEnd?: number })
                        : undefined;
                const academicYear =
                    academicYearRef?.yearStart && academicYearRef?.yearEnd
                        ? `${academicYearRef.yearStart}-${academicYearRef.yearEnd}`
                        : "Academic year";
                const unit =
                    plan?.scopeType === "Department"
                        ? typeof plan.departmentId === "object" && plan.departmentId && "name" in plan.departmentId
                            ? String(plan.departmentId.name)
                            : "Department"
                        : typeof plan?.institutionId === "object" &&
                            plan.institutionId &&
                            "name" in plan.institutionId
                          ? String(plan.institutionId.name)
                          : "Institution";

                return {
                    id: row._id.toString(),
                    moduleName: "RESEARCH_INNOVATION" as const,
                    title: plan?.title ?? "Research portfolio record",
                    subtitle: `${plan?.focusArea ?? "Integrated"} · ${unit} · ${academicYear}`,
                    status: row.status,
                    actionLabel: researchInnovationFinalIdSet.has(row._id.toString())
                        ? "Final approval"
                        : "Review required",
                    href: "/director/research-innovation",
                    updatedAt: formatQueueDate(row.updatedAt),
                };
            }),
    ]
        .sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")))
        .slice(0, 12);

    const access = formatDisplayRole(profile, assignments);
    const departmentBreakdown = await loadDepartmentBreakdown(
        departmentIds,
        departmentNameById,
        facultyRoster,
        evidenceSummary
    );

    return {
        access: {
            displayRole: access.displayRole,
            roleLabels: access.roleLabels,
            scopeCount: profile.browseScopes.length,
        },
        metrics: {
            facultyCount: facultyRoster.length,
            departmentCount: departmentIds.length,
            activeAssignments: assignments.length,
            activeCommittees: committees.length,
            actionableItems:
                pbasReviewIds.length +
                pbasFinalIds.length +
                casReviewIds.length +
                casFinalIds.length +
                aqarReviewIds.length +
                aqarFinalIds.length +
                ssrReviewIds.length +
                ssrFinalIds.length +
                curriculumReviewIds.length +
                curriculumFinalIds.length +
                teachingLearningReviewIds.length +
                teachingLearningFinalIds.length +
                studentSupportGovernanceReviewIds.length +
                studentSupportGovernanceFinalIds.length +
                researchInnovationReviewIds.length +
                researchInnovationFinalIds.length,
            evidencePending: evidenceSummary.pendingCount,
            staleEvidence: evidenceSummary.stalePendingCount,
        },
        assignments,
        committees,
        scopes: profile.browseScopes.map(createScopeLabel),
        modules: {
            PBAS: {
                total: pbasRecords.length,
                actionable: pbasReviewIds.length + pbasFinalIds.length,
                finalApprovals: pbasFinalIds.length,
                approved: pbasRecords.filter((row) => row.status === "Approved").length,
                rejected: pbasRecords.filter((row) => row.status === "Rejected").length,
                draft: pbasRecords.filter((row) => row.status === "Draft").length,
            },
            CAS: {
                total: casRecords.length,
                actionable: casReviewIds.length + casFinalIds.length,
                finalApprovals: casFinalIds.length,
                approved: casRecords.filter((row) => row.status === "Approved").length,
                rejected: casRecords.filter((row) => row.status === "Rejected").length,
                draft: casRecords.filter((row) => row.status === "Draft").length,
            },
            AQAR: {
                total: aqarRecords.length,
                actionable: aqarReviewIds.length + aqarFinalIds.length,
                finalApprovals: aqarFinalIds.length,
                approved: aqarRecords.filter((row) => row.status === "Approved").length,
                rejected: aqarRecords.filter((row) => row.status === "Rejected").length,
                draft: aqarRecords.filter((row) => row.status === "Draft").length,
            },
            SSR: {
                total: ssrRecords.length,
                actionable: ssrReviewIds.length + ssrFinalIds.length,
                finalApprovals: ssrFinalIds.length,
                approved: ssrRecords.filter((row) => row.status === "Approved").length,
                rejected: ssrRecords.filter((row) => row.status === "Rejected").length,
                draft: ssrRecords.filter((row) => row.status === "Draft").length,
            },
            CURRICULUM: {
                total: curriculumRecords.length,
                actionable: curriculumReviewIds.length + curriculumFinalIds.length,
                finalApprovals: curriculumFinalIds.length,
                approved: curriculumRecords.filter((row) => row.status === "Approved").length,
                rejected: curriculumRecords.filter((row) => row.status === "Rejected").length,
                draft: curriculumRecords.filter((row) => row.status === "Draft").length,
            },
            TEACHING_LEARNING: {
                total: teachingLearningRecords.length,
                actionable: teachingLearningReviewIds.length + teachingLearningFinalIds.length,
                finalApprovals: teachingLearningFinalIds.length,
                approved: teachingLearningRecords.filter((row) => row.status === "Approved").length,
                rejected: teachingLearningRecords.filter((row) => row.status === "Rejected").length,
                draft: teachingLearningRecords.filter((row) => row.status === "Draft").length,
            },
            INFRASTRUCTURE_LIBRARY: {
                total: infrastructureLibraryRecords.length,
                actionable:
                    infrastructureLibraryReviewIds.length + infrastructureLibraryFinalIds.length,
                finalApprovals: infrastructureLibraryFinalIds.length,
                approved: infrastructureLibraryRecords.filter((row) => row.status === "Approved").length,
                rejected: infrastructureLibraryRecords.filter((row) => row.status === "Rejected").length,
                draft: infrastructureLibraryRecords.filter((row) => row.status === "Draft").length,
            },
            STUDENT_SUPPORT_GOVERNANCE: {
                total: studentSupportGovernanceRecords.length,
                actionable:
                    studentSupportGovernanceReviewIds.length +
                    studentSupportGovernanceFinalIds.length,
                finalApprovals: studentSupportGovernanceFinalIds.length,
                approved: studentSupportGovernanceRecords.filter((row) => row.status === "Approved").length,
                rejected: studentSupportGovernanceRecords.filter((row) => row.status === "Rejected").length,
                draft: studentSupportGovernanceRecords.filter((row) => row.status === "Draft").length,
            },
            RESEARCH_INNOVATION: {
                total: researchInnovationRecords.length,
                actionable:
                    researchInnovationReviewIds.length + researchInnovationFinalIds.length,
                finalApprovals: researchInnovationFinalIds.length,
                approved: researchInnovationRecords.filter((row) => row.status === "Approved").length,
                rejected: researchInnovationRecords.filter((row) => row.status === "Rejected").length,
                draft: researchInnovationRecords.filter((row) => row.status === "Draft").length,
            },
        },
        queue: {
            totalActionable:
                pbasReviewIds.length +
                pbasFinalIds.length +
                casReviewIds.length +
                casFinalIds.length +
                aqarReviewIds.length +
                aqarFinalIds.length +
                ssrReviewIds.length +
                ssrFinalIds.length +
                curriculumReviewIds.length +
                curriculumFinalIds.length +
                teachingLearningReviewIds.length +
                teachingLearningFinalIds.length +
                infrastructureLibraryReviewIds.length +
                infrastructureLibraryFinalIds.length +
                studentSupportGovernanceReviewIds.length +
                studentSupportGovernanceFinalIds.length +
                researchInnovationReviewIds.length +
                researchInnovationFinalIds.length,
            reviewCount:
                pbasReviewIds.length +
                casReviewIds.length +
                aqarReviewIds.length +
                ssrReviewIds.length +
                curriculumReviewIds.length +
                teachingLearningReviewIds.length +
                infrastructureLibraryReviewIds.length +
                studentSupportGovernanceReviewIds.length +
                researchInnovationReviewIds.length,
            finalCount:
                pbasFinalIds.length +
                casFinalIds.length +
                aqarFinalIds.length +
                ssrFinalIds.length +
                curriculumFinalIds.length +
                teachingLearningFinalIds.length +
                infrastructureLibraryFinalIds.length +
                studentSupportGovernanceFinalIds.length +
                researchInnovationFinalIds.length,
            items: queueItems,
        },
        facultyRoster,
        departmentBreakdown,
    };
}

export async function getLeadershipCsvExport(
    actor: LeadershipDashboardActor,
    exportType: "faculty-roster" | "department-summary"
) {
    const dashboard = await getLeadershipDashboardData(actor);

    if (exportType === "department-summary") {
        return {
            fileName: "leadership-department-summary.csv",
            rows: [
                ["Department", "Faculty Count", "PBAS Pending", "CAS Pending", "AQAR Pending", "Evidence Pending"],
                ...dashboard.departmentBreakdown.map((row) => [
                    row.departmentName,
                    String(row.facultyCount),
                    String(row.pbasPending),
                    String(row.casPending),
                    String(row.aqarPending),
                    String(row.evidencePending),
                ]),
            ],
        };
    }

    return {
        fileName: "leadership-faculty-roster.csv",
        rows: [
            [
                "Faculty Name",
                "Employee Code",
                "Designation",
                "Email",
                "Department",
                "Institution",
                "PBAS Status",
                "CAS Status",
                "AQAR Status",
                "Needs Attention",
            ],
            ...dashboard.facultyRoster.map((row) => [
                row.facultyName,
                row.employeeCode,
                row.designation,
                row.email ?? "",
                row.departmentName ?? "",
                row.institutionName ?? "",
                row.pbasStatus ?? "",
                row.casStatus ?? "",
                row.aqarStatus ?? "",
                row.needsAttention ? "Yes" : "No",
            ]),
        ],
    };
}

export async function getLeadershipStudentRoster(
    actor: LeadershipDashboardActor
): Promise<LeadershipStudentRow[]> {
    await dbConnect();

    const profile = await resolveAuthorizationProfile(actor);
    const departmentIds = await resolveAuthorizedEvidenceDepartmentIds(profile);

    if (!departmentIds.length) {
        return [];
    }

    const departments = await Department.find({ _id: { $in: toObjectIdArray(departmentIds) } })
        .populate("institutionId", "name")
        .select("_id name institutionId")
        .lean();

    const departmentNameById = new Map(departments.map((row) => [row._id.toString(), row.name]));
    const institutionNameByDepartmentId = new Map(
        departments.map((row) => [
            row._id.toString(),
            typeof row.institutionId === "object" && row.institutionId && "name" in row.institutionId
                ? String(row.institutionId.name)
                : undefined,
        ])
    );

    return loadStudentRoster(departmentIds, departmentNameById, institutionNameByDepartmentId);
}

export async function getLeadershipStudentRecords(
    actor: LeadershipDashboardActor,
    studentId: string
): Promise<LeadershipStudentRecordsData> {
    await dbConnect();

    if (!Types.ObjectId.isValid(studentId)) {
        throw new AuthError("Invalid student identifier.", 400);
    }

    const profile = await resolveAuthorizationProfile(actor);
    const departmentIds = await resolveAuthorizedEvidenceDepartmentIds(profile);

    if (!departmentIds.length) {
        throw new AuthError("You do not have department scope access.", 403);
    }

    const student = await Student.findById(studentId).select("departmentId").lean();

    if (!student) {
        throw new AuthError("Student not found.", 404);
    }

    const studentDepartmentId = student.departmentId?.toString();
    if (!studentDepartmentId || !departmentIds.includes(studentDepartmentId)) {
        throw new AuthError("You are not authorized to view this student.", 403);
    }

    const [
        academics,
        publications,
        researchProjects,
        awards,
        skills,
        sports,
        cultural,
        events,
        social,
        internships,
        placements,
    ] = await Promise.all([
        StudentAcademicRecord.find({ studentId: student._id })
            .populate("semesterId", "semesterNumber")
            .sort({ semesterId: 1 })
            .lean(),
        StudentPublication.find({ studentId: student._id })
            .populate("documentId", "fileName fileUrl verificationStatus")
            .sort({ publicationDate: -1, createdAt: -1 })
            .lean(),
        StudentResearchProject.find({ studentId: student._id })
            .populate("documentId", "fileName fileUrl verificationStatus")
            .sort({ startDate: -1, createdAt: -1 })
            .lean(),
        StudentAward.find({ studentId: student._id })
            .populate("awardId", "title category level organizingBody")
            .populate("documentId", "fileName fileUrl verificationStatus")
            .sort({ awardDate: -1, createdAt: -1 })
            .lean(),
        StudentSkill.find({ studentId: student._id })
            .populate("skillId", "name category")
            .populate("documentId", "fileName fileUrl verificationStatus")
            .sort({ startDate: -1, createdAt: -1 })
            .lean(),
        StudentSport.find({ studentId: student._id })
            .populate("sportId", "sportName")
            .populate("documentId", "fileName fileUrl verificationStatus")
            .sort({ eventDate: -1, createdAt: -1 })
            .lean(),
        StudentCulturalParticipation.find({ studentId: student._id })
            .populate("activityId", "name category")
            .populate("documentId", "fileName fileUrl verificationStatus")
            .sort({ date: -1, createdAt: -1 })
            .lean(),
        StudentEventParticipation.find({ studentId: student._id })
            .populate("eventId", "title eventType organizedBy startDate")
            .populate("documentId", "fileName fileUrl verificationStatus")
            .sort({ createdAt: -1 })
            .lean(),
        StudentSocialParticipation.find({ studentId: student._id })
            .populate("programId", "name type")
            .populate("documentId", "fileName fileUrl verificationStatus")
            .sort({ date: -1, createdAt: -1 })
            .lean(),
        Internship.find({ studentId: student._id })
            .populate("documentId", "fileName fileUrl verificationStatus")
            .sort({ startDate: -1, createdAt: -1 })
            .lean(),
        Placement.find({ studentId: student._id })
            .sort({ offerDate: -1, createdAt: -1 })
            .lean(),
    ]);

    const payload: LeadershipStudentRecordsData = {
        summary: {
            academics: academics.length,
            publications: publications.length,
            researchProjects: researchProjects.length,
            awards: awards.length,
            skills: skills.length,
            sports: sports.length,
            cultural: cultural.length,
            events: events.length,
            social: social.length,
            internships: internships.length,
            placements: placements.length,
            total:
                academics.length +
                publications.length +
                researchProjects.length +
                awards.length +
                skills.length +
                sports.length +
                cultural.length +
                events.length +
                social.length +
                internships.length +
                placements.length,
        },
        academics: academics.map((row) => {
            const semesterRef = row.semesterId as { semesterNumber?: number } | undefined;
            return {
                id: row._id.toString(),
                semester: semesterRef?.semesterNumber ? `Semester ${semesterRef.semesterNumber}` : "-",
                sgpa: row.sgpa,
                cgpa: row.cgpa,
                percentage: row.percentage,
                rank: row.rank,
                resultStatus: row.resultStatus,
            };
        }),
        publications: publications.map((row) => ({
            id: row._id.toString(),
            title: row.title,
            publicationType: row.publicationType,
            journalName: row.journalName,
            publisher: row.publisher,
            publicationDate: formatQueueDate(row.publicationDate),
            doi: row.doi,
            indexedIn: row.indexedIn,
            document: mapDocumentRef(row.documentId),
        })),
        researchProjects: researchProjects.map((row) => ({
            id: row._id.toString(),
            title: row.title,
            guideName: row.guideName,
            status: row.status,
            startDate: formatQueueDate(row.startDate),
            endDate: formatQueueDate(row.endDate),
            description: row.description,
            document: mapDocumentRef(row.documentId),
        })),
        awards: awards.map((row) => {
            const awardRef = row.awardId as {
                title?: string;
                category?: string;
                level?: string;
                organizingBody?: string;
            } | undefined;
            return {
                id: row._id.toString(),
                title: awardRef?.title ?? "Award",
                category: awardRef?.category,
                level: awardRef?.level,
                organizingBody: awardRef?.organizingBody,
                awardDate: formatQueueDate(row.awardDate),
                document: mapDocumentRef(row.documentId),
            };
        }),
        skills: skills.map((row) => {
            const skillRef = row.skillId as { name?: string; category?: string } | undefined;
            return {
                id: row._id.toString(),
                name: skillRef?.name ?? "Skill",
                category: skillRef?.category,
                provider: row.provider,
                startDate: formatQueueDate(row.startDate),
                endDate: formatQueueDate(row.endDate),
                document: mapDocumentRef(row.documentId),
            };
        }),
        sports: sports.map((row) => {
            const sportRef = row.sportId as { sportName?: string } | undefined;
            return {
                id: row._id.toString(),
                sportName: sportRef?.sportName ?? "Sport",
                eventName: row.eventName,
                level: row.level,
                position: row.position,
                eventDate: formatQueueDate(row.eventDate),
                document: mapDocumentRef(row.documentId),
            };
        }),
        cultural: cultural.map((row) => {
            const activityRef = row.activityId as { name?: string; category?: string } | undefined;
            return {
                id: row._id.toString(),
                activityName: activityRef?.name ?? "Activity",
                category: activityRef?.category,
                eventName: row.eventName,
                level: row.level,
                position: row.position,
                date: formatQueueDate(row.date),
                document: mapDocumentRef(row.documentId),
            };
        }),
        events: events.map((row) => {
            const eventRef = row.eventId as {
                title?: string;
                eventType?: string;
                organizedBy?: string;
                startDate?: Date;
            } | undefined;
            return {
                id: row._id.toString(),
                title: eventRef?.title ?? "Event",
                eventType: eventRef?.eventType,
                organizedBy: eventRef?.organizedBy,
                role: row.role,
                paperTitle: row.paperTitle,
                eventDate: formatQueueDate(eventRef?.startDate),
                document: mapDocumentRef(row.documentId),
            };
        }),
        social: social.map((row) => {
            const programRef = row.programId as { name?: string; type?: string } | undefined;
            return {
                id: row._id.toString(),
                programName: programRef?.name ?? "Program",
                programType: programRef?.type,
                activityName: row.activityName,
                hoursContributed: row.hoursContributed,
                date: formatQueueDate(row.date),
                document: mapDocumentRef(row.documentId),
            };
        }),
        internships: internships.map((row) => ({
            id: row._id.toString(),
            companyName: row.companyName,
            role: row.role,
            startDate: formatQueueDate(row.startDate),
            endDate: formatQueueDate(row.endDate),
            stipend: row.stipend,
            document: mapDocumentRef(row.documentId),
        })),
        placements: placements.map((row) => ({
            id: row._id.toString(),
            companyName: row.companyName,
            jobRole: row.jobRole,
            package: row.package,
            offerDate: formatQueueDate(row.offerDate),
            joiningDate: formatQueueDate(row.joiningDate),
        })),
    };

    return payload;
}

export async function getLeadershipFacultyRecords(
    actor: LeadershipDashboardActor,
    facultyId: string
): Promise<LeadershipFacultyRecordsData> {
    await dbConnect();

    if (!Types.ObjectId.isValid(facultyId)) {
        throw new AuthError("Invalid faculty identifier.", 400);
    }

    const profile = await resolveAuthorizationProfile(actor);
    const departmentIds = await resolveAuthorizedEvidenceDepartmentIds(profile);

    if (!departmentIds.length) {
        throw new AuthError("You do not have department scope access.", 403);
    }

    const faculty = await Faculty.findById(facultyId).select("departmentId").lean();

    if (!faculty) {
        throw new AuthError("Faculty not found.", 404);
    }

    const facultyDepartmentId = faculty.departmentId?.toString();
    if (!facultyDepartmentId || !departmentIds.includes(facultyDepartmentId)) {
        throw new AuthError("You are not authorized to view this faculty record.", 403);
    }

    const [pbas, cas, aqar] = await Promise.all([
        FacultyPbasForm.find({ facultyId: faculty._id })
            .select("academicYear status submissionStatus submittedAt reviewCommittee updatedAt")
            .sort({ updatedAt: -1 })
            .lean(),
        CasApplication.find({ facultyId: faculty._id })
            .select(
                "applicationYear currentDesignation applyingForDesignation status apiScore.totalScore experienceYears submittedAt updatedAt"
            )
            .sort({ updatedAt: -1 })
            .lean(),
        AqarApplication.find({ facultyId: faculty._id })
            .select(
                "academicYear status metrics.totalContributionIndex metrics.researchPaperCount metrics.patentCount submittedAt updatedAt"
            )
            .sort({ updatedAt: -1 })
            .lean(),
    ]);

    const allStatuses = [
        ...pbas.map((row) => row.status),
        ...cas.map((row) => row.status),
        ...aqar.map((row) => row.status),
    ];

    const pending = allStatuses.filter((status) => isPendingStatus(status)).length;
    const approved = allStatuses.filter((status) => status === "Approved").length;
    const rejected = allStatuses.filter((status) => status === "Rejected").length;

    return {
        summary: {
            pbas: pbas.length,
            cas: cas.length,
            aqar: aqar.length,
            pending,
            approved,
            rejected,
            total: pbas.length + cas.length + aqar.length,
        },
        pbas: pbas.map((row) => ({
            id: row._id.toString(),
            academicYear: row.academicYear,
            status: row.status,
            submissionStatus: row.submissionStatus,
            submittedAt: formatQueueDate(row.submittedAt),
            updatedAt: formatQueueDate(row.updatedAt),
            reviewCount: row.reviewCommittee?.length ?? 0,
        })),
        cas: cas.map((row) => ({
            id: row._id.toString(),
            applicationYear: row.applicationYear,
            currentDesignation: row.currentDesignation,
            applyingForDesignation: row.applyingForDesignation,
            status: row.status,
            apiScore: row.apiScore?.totalScore,
            experienceYears: row.experienceYears,
            submittedAt: formatQueueDate(row.submittedAt),
            updatedAt: formatQueueDate(row.updatedAt),
        })),
        aqar: aqar.map((row) => ({
            id: row._id.toString(),
            academicYear: row.academicYear,
            status: row.status,
            contributionIndex: row.metrics?.totalContributionIndex,
            researchPaperCount: row.metrics?.researchPaperCount,
            patentCount: row.metrics?.patentCount,
            submittedAt: formatQueueDate(row.submittedAt),
            updatedAt: formatQueueDate(row.updatedAt),
        })),
    };
}
