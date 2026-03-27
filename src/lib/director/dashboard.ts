import { Types } from "mongoose";

import {
    buildAuthorizedScopeQuery,
    resolveAuthorizationProfile,
    resolveAuthorizedEvidenceDepartmentIds,
    type AuthorizationActor,
    type AuthorizationProfile,
    type AuthorizationScope,
} from "@/lib/authorization/service";
import dbConnect from "@/lib/dbConnect";
import { getEvidenceDashboardSummary } from "@/lib/evidence/service";
import { listPendingWorkflowRecordIds } from "@/lib/workflow/engine";
import AqarApplication from "@/models/core/aqar-application";
import GovernanceCommitteeMembership from "@/models/core/governance-committee-membership";
import LeadershipAssignment, { type LeadershipAssignmentType } from "@/models/core/leadership-assignment";
import CasApplication from "@/models/core/cas-application";
import FacultyPbasForm from "@/models/core/faculty-pbas-form";
import Department from "@/models/reference/department";
import Faculty from "@/models/faculty/faculty";
import User from "@/models/core/user";

type LeadershipDashboardActor = AuthorizationActor;

type LeadershipQueueItem = {
    id: string;
    moduleName: "PBAS" | "CAS" | "AQAR";
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

type LeadershipFacultyRow = {
    facultyId: string;
    facultyName: string;
    employeeCode: string;
    designation: string;
    email?: string;
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
    modules: Record<"PBAS" | "CAS" | "AQAR", LeadershipModuleSummary>;
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
        .select("userId employeeCode firstName lastName designation departmentId status")
        .sort({ firstName: 1, lastName: 1 })
        .lean();

    const userIds = faculty
        .map((row) => row.userId?.toString())
        .filter((value): value is string => Boolean(value));

    const [users, pbasRows, casRows, aqarRows] = await Promise.all([
        User.find({ _id: { $in: toObjectIdArray(userIds) } })
            .select("email")
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

    const emailByUserId = new Map(users.map((user) => [user._id.toString(), user.email]));
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

        return {
            facultyId,
            facultyName,
            employeeCode: row.employeeCode,
            designation: row.designation,
            email: row.userId ? emailByUserId.get(row.userId.toString()) : undefined,
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

    const [departmentIds, pbasRecords, casRecords, aqarRecords, pbasReviewIds, pbasFinalIds, casReviewIds, casFinalIds, aqarReviewIds, aqarFinalIds] =
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
            listPendingWorkflowRecordIds({ actor, moduleName: "PBAS", stageKinds: ["review"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "PBAS", stageKinds: ["final"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "CAS", stageKinds: ["review"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "CAS", stageKinds: ["final"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "AQAR", stageKinds: ["review"] }),
            listPendingWorkflowRecordIds({ actor, moduleName: "AQAR", stageKinds: ["final"] }),
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

    const pbasFinalIdSet = new Set(pbasFinalIds);
    const casFinalIdSet = new Set(casFinalIds);
    const aqarFinalIdSet = new Set(aqarFinalIds);

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
                aqarFinalIds.length,
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
        },
        queue: {
            totalActionable:
                pbasReviewIds.length +
                pbasFinalIds.length +
                casReviewIds.length +
                casFinalIds.length +
                aqarReviewIds.length +
                aqarFinalIds.length,
            reviewCount: pbasReviewIds.length + casReviewIds.length + aqarReviewIds.length,
            finalCount: pbasFinalIds.length + casFinalIds.length + aqarFinalIds.length,
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
