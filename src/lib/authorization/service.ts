import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import Department from "@/models/reference/department";
import Faculty from "@/models/faculty/faculty";
import Institution from "@/models/reference/institution";
import Organization, { type OrganizationType } from "@/models/core/organization";
import User from "@/models/core/user";
import type { LeadershipAssignmentType } from "@/models/core/leadership-assignment";
import LeadershipAssignment from "@/models/core/leadership-assignment";
import type { GovernanceCommitteeType } from "@/models/core/governance-committee";
import GovernanceCommitteeMembership from "@/models/core/governance-committee-membership";
import type { WorkflowApproverRole, WorkflowModuleName } from "@/models/core/workflow-definition";

export type AuthorizationActor = {
    id: string;
    name: string;
    role: string;
    department?: string;
    collegeName?: string;
    universityName?: string;
};

export type AuthorizationSubjectScope = {
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

export type AuthorizationScope = {
    source: "leadership" | "committee" | "legacy";
    sourceType?: LeadershipAssignmentType | GovernanceCommitteeType | "LEGACY_HEAD";
    organizationId?: string;
    organizationType?: OrganizationType | "InstitutionWide";
    organizationName?: string;
    departmentId?: string;
    institutionId?: string;
    departmentOrganizationId?: string;
    collegeOrganizationId?: string;
    universityOrganizationId?: string;
    universityName?: string;
    collegeName?: string;
};

export type AuthorizationProfile = {
    actorId: string;
    actorRole: string;
    isAdmin: boolean;
    isFaculty: boolean;
    isStudent: boolean;
    hasLeadershipPortalAccess: boolean;
    browseScopes: AuthorizationScope[];
    workflowRoles: WorkflowApproverRole[];
    workflowRoleScopes: Partial<Record<WorkflowApproverRole, AuthorizationScope[]>>;
};

const compatibilityMode = true;

const workflowRoleByCommitteeType: Partial<Record<GovernanceCommitteeType, WorkflowApproverRole>> = {
    IQAC: "IQAC",
    PBAS_REVIEW: "PBAS_COMMITTEE",
    CAS_SCREENING: "CAS_COMMITTEE",
    AQAR_REVIEW: "AQAR_COMMITTEE",
    SSR_REVIEW: "SSR_COMMITTEE",
    TEACHING_LEARNING_REVIEW: "TEACHING_LEARNING_COMMITTEE",
    RESEARCH_COMMITTEE: "RESEARCH_COMMITTEE",
    INFRASTRUCTURE_LIBRARY_REVIEW: "INFRASTRUCTURE_LIBRARY_COMMITTEE",
    STUDENT_SUPPORT_GOVERNANCE_REVIEW: "STUDENT_SUPPORT_GOVERNANCE_COMMITTEE",
    BOARD_OF_STUDIES: "BOARD_OF_STUDIES",
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

function pushScopedRole(
    collection: Partial<Record<WorkflowApproverRole, AuthorizationScope[]>>,
    role: WorkflowApproverRole,
    scope: AuthorizationScope
) {
    const current = collection[role] ?? [];
    current.push(scope);
    collection[role] = current;
}

function createScopeKey(scope: AuthorizationScope) {
    return [
        scope.source,
        scope.sourceType,
        scope.organizationId,
        scope.organizationType,
        scope.departmentId,
        scope.institutionId,
        scope.departmentOrganizationId,
        scope.collegeOrganizationId,
        scope.universityOrganizationId,
        scope.collegeName,
        scope.universityName,
    ]
        .map((value) => String(value ?? ""))
        .join(":");
}

function dedupeScopes(scopes: AuthorizationScope[]) {
    const seen = new Set<string>();
    return scopes.filter((scope) => {
        const key = createScopeKey(scope);
        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

function toObjectIdArray(ids: string[]) {
    return ids
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
}

function mapLeadershipAssignmentTypeToWorkflowRoles(assignmentType: LeadershipAssignmentType) {
    if (assignmentType === "HOD") {
        return ["DEPARTMENT_HEAD"] as const;
    }

    if (assignmentType === "PRINCIPAL") {
        return ["PRINCIPAL"] as const;
    }

    if (assignmentType === "IQAC_COORDINATOR") {
        return ["IQAC"] as const;
    }

    if (assignmentType === "DIRECTOR") {
        return ["DIRECTOR"] as const;
    }

    if (assignmentType === "OFFICE_HEAD") {
        return ["OFFICE_HEAD"] as const;
    }

    return [] as const;
}

async function resolveOrganizationAncestors(
    organizationId: string,
    cache: Map<string, Awaited<ReturnType<typeof loadOrganizationChain>>>
) {
    if (cache.has(organizationId)) {
        return cache.get(organizationId) ?? null;
    }

    const chain = await loadOrganizationChain(organizationId);
    cache.set(organizationId, chain);
    return chain;
}

async function loadOrganizationChain(organizationId: string) {
    if (!Types.ObjectId.isValid(organizationId)) {
        return null;
    }

    const organization = await Organization.findById(organizationId).select(
        "name type parentOrganizationId universityName collegeName"
    );

    if (!organization) {
        return null;
    }

    let parent = null;
    let grandParent = null;

    if (organization.parentOrganizationId) {
        parent = await Organization.findById(organization.parentOrganizationId).select(
            "name type parentOrganizationId universityName collegeName"
        );
    }

    if (parent?.parentOrganizationId) {
        grandParent = await Organization.findById(parent.parentOrganizationId).select(
            "name type parentOrganizationId universityName collegeName"
        );
    }

    const departmentOrganization =
        organization.type === "Department"
            ? organization
            : parent?.type === "Department"
              ? parent
              : grandParent?.type === "Department"
                ? grandParent
                : null;

    const collegeOrganization =
        organization.type === "College"
            ? organization
            : parent?.type === "College"
              ? parent
              : grandParent?.type === "College"
                ? grandParent
                : null;

    const universityOrganization =
        organization.type === "University"
            ? organization
            : parent?.type === "University"
              ? parent
              : grandParent?.type === "University"
                ? grandParent
                : null;

    const [department, institution] = await Promise.all([
        departmentOrganization
            ? Department.findOne({ organizationId: departmentOrganization._id }).select("_id")
            : null,
        universityOrganization
            ? Institution.findOne({ organizationId: universityOrganization._id }).select("_id")
            : null,
    ]);

    return {
        organization,
        departmentOrganization,
        collegeOrganization,
        universityOrganization,
        department,
        institution,
    };
}

async function resolveScopeFromOrganization(
    organizationId: string | undefined,
    options: {
        source: AuthorizationScope["source"];
        sourceType?: AuthorizationScope["sourceType"];
        organizationType?: AuthorizationScope["organizationType"];
        organizationName?: string;
        universityName?: string;
        collegeName?: string;
    },
    cache: Map<string, Awaited<ReturnType<typeof loadOrganizationChain>>>
): Promise<AuthorizationScope | null> {
    if (!organizationId) {
        return {
            source: options.source,
            sourceType: options.sourceType,
            organizationType: options.organizationType,
            organizationName: options.organizationName,
            universityName: options.universityName,
            collegeName: options.collegeName,
        };
    }

    const chain = await resolveOrganizationAncestors(organizationId, cache);

    if (!chain?.organization) {
        return {
            source: options.source,
            sourceType: options.sourceType,
            organizationId,
            organizationType: options.organizationType,
            organizationName: options.organizationName,
            universityName: options.universityName,
            collegeName: options.collegeName,
        };
    }

    return {
        source: options.source,
        sourceType: options.sourceType,
        organizationId: chain.organization._id.toString(),
        organizationType: (options.organizationType ?? chain.organization.type) as AuthorizationScope["organizationType"],
        organizationName: options.organizationName ?? chain.organization.name,
        departmentId: chain.department?._id?.toString(),
        institutionId: chain.institution?._id?.toString(),
        departmentOrganizationId: chain.departmentOrganization?._id?.toString(),
        collegeOrganizationId: chain.collegeOrganization?._id?.toString(),
        universityOrganizationId: chain.universityOrganization?._id?.toString(),
        universityName:
            options.universityName ??
            chain.universityOrganization?.name ??
            chain.organization.universityName,
        collegeName:
            options.collegeName ??
            chain.collegeOrganization?.name ??
            chain.organization.collegeName,
    };
}

function subjectMatchesScope(subject: AuthorizationSubjectScope, scope: AuthorizationScope) {
    const subjectOrganizationIds = new Set(uniqueStrings(subject.subjectOrganizationIds ?? []));

    if (scope.organizationId && subjectOrganizationIds.has(scope.organizationId)) {
        return true;
    }

    if (scope.departmentOrganizationId) {
        return scope.departmentOrganizationId === subject.departmentOrganizationId;
    }

    if (scope.departmentId) {
        return scope.departmentId === subject.departmentId;
    }

    if (scope.collegeOrganizationId) {
        return scope.collegeOrganizationId === subject.collegeOrganizationId;
    }

    if (scope.universityOrganizationId) {
        return scope.universityOrganizationId === subject.universityOrganizationId;
    }

    if (scope.institutionId) {
        return scope.institutionId === subject.institutionId;
    }

    if (scope.organizationType === "Department" && scope.organizationName) {
        return scope.organizationName === subject.departmentName;
    }

    if (scope.organizationType === "College" && scope.organizationName) {
        return scope.organizationName === subject.collegeName;
    }

    if (
        (scope.organizationType === "University" || scope.organizationType === "InstitutionWide") &&
        scope.organizationName
    ) {
        return scope.organizationName === subject.universityName;
    }

    if (scope.collegeName && subject.collegeName) {
        return scope.collegeName === subject.collegeName;
    }

    if (scope.universityName && subject.universityName) {
        return scope.universityName === subject.universityName;
    }

    return false;
}

export async function resolveFacultyAuthorizationScope(facultyId: string): Promise<AuthorizationSubjectScope> {
    await dbConnect();

    if (!Types.ObjectId.isValid(facultyId)) {
        throw new Error("Invalid faculty identifier.");
    }

    const faculty = await Faculty.findById(facultyId).select("userId departmentId institutionId");
    if (!faculty) {
        throw new Error("Faculty record not found.");
    }

    const [user, department, institution] = await Promise.all([
        faculty.userId
            ? User.findById(faculty.userId).select("department collegeName universityName")
            : null,
        faculty.departmentId
            ? Department.findById(faculty.departmentId).select("_id name organizationId institutionId")
            : null,
        faculty.institutionId
            ? Institution.findById(faculty.institutionId).select("_id name organizationId")
            : null,
    ]);

    const organizationCache = new Map<string, Awaited<ReturnType<typeof loadOrganizationChain>>>();
    const departmentChain =
        department?.organizationId
            ? await resolveOrganizationAncestors(department.organizationId.toString(), organizationCache)
            : null;
    const institutionChain =
        institution?.organizationId
            ? await resolveOrganizationAncestors(institution.organizationId.toString(), organizationCache)
            : null;

    const departmentOrganizationId =
        departmentChain?.departmentOrganization?._id?.toString() ??
        department?.organizationId?.toString();
    const collegeOrganizationId =
        departmentChain?.collegeOrganization?._id?.toString() ??
        institutionChain?.collegeOrganization?._id?.toString();
    const universityOrganizationId =
        departmentChain?.universityOrganization?._id?.toString() ??
        institutionChain?.universityOrganization?._id?.toString() ??
        institution?.organizationId?.toString();

    return {
        departmentName: department?.name ?? user?.department,
        collegeName:
            departmentChain?.collegeOrganization?.name ??
            institutionChain?.collegeOrganization?.name ??
            user?.collegeName,
        universityName:
            departmentChain?.universityOrganization?.name ??
            institutionChain?.universityOrganization?.name ??
            institution?.name ??
            user?.universityName,
        departmentId: department?._id?.toString(),
        institutionId: institution?._id?.toString(),
        departmentOrganizationId,
        collegeOrganizationId,
        universityOrganizationId,
        subjectOrganizationIds: uniqueStrings([
            departmentOrganizationId,
            collegeOrganizationId,
            universityOrganizationId,
        ]),
    };
}

export async function resolveAuthorizationProfile(actor: AuthorizationActor): Promise<AuthorizationProfile> {
    await dbConnect();

    const workflowRoles = new Set<WorkflowApproverRole>();
    const browseScopes: AuthorizationScope[] = [];
    const workflowRoleScopes: Partial<Record<WorkflowApproverRole, AuthorizationScope[]>> = {};
    const organizationCache = new Map<string, Awaited<ReturnType<typeof loadOrganizationChain>>>();

    const [assignments, memberships] = await Promise.all([
        LeadershipAssignment.find({
            userId: new Types.ObjectId(actor.id),
            isActive: true,
            $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: new Date() } }],
        }).select("assignmentType organizationId organizationType organizationName universityName collegeName"),
        GovernanceCommitteeMembership.find({
            userId: new Types.ObjectId(actor.id),
            isActive: true,
            $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: new Date() } }],
        })
            .populate("committeeId", "committeeType scopeType organizationId organizationType organizationName universityName collegeName isActive")
            .select("committeeId"),
    ]);

    for (const assignment of assignments) {
        const scope = await resolveScopeFromOrganization(
            assignment.organizationId?.toString(),
            {
                source: "leadership",
                sourceType: assignment.assignmentType,
                organizationType: assignment.organizationType as AuthorizationScope["organizationType"],
                organizationName: assignment.organizationName,
                universityName: assignment.universityName,
                collegeName: assignment.collegeName,
            },
            organizationCache
        );

        if (!scope) {
            continue;
        }

        browseScopes.push(scope);

        for (const role of mapLeadershipAssignmentTypeToWorkflowRoles(assignment.assignmentType)) {
            workflowRoles.add(role);
            pushScopedRole(workflowRoleScopes, role, scope);
        }
    }

    for (const membership of memberships) {
        const committee = membership.committeeId as {
            committeeType?: GovernanceCommitteeType;
            scopeType?: AuthorizationScope["organizationType"];
            organizationId?: Types.ObjectId;
            organizationType?: string;
            organizationName?: string;
            universityName?: string;
            collegeName?: string;
            isActive?: boolean;
        } | null;

        if (!committee?.isActive) {
            continue;
        }

        const scope = await resolveScopeFromOrganization(
            committee.organizationId?.toString(),
            {
                source: "committee",
                sourceType: committee.committeeType,
                organizationType: (committee.organizationType ?? committee.scopeType) as AuthorizationScope["organizationType"],
                organizationName: committee.organizationName,
                universityName: committee.universityName,
                collegeName: committee.collegeName,
            },
            organizationCache
        );

        if (scope) {
            browseScopes.push(scope);
        }

        const workflowRole = committee.committeeType
            ? workflowRoleByCommitteeType[committee.committeeType]
            : undefined;

        if (workflowRole && scope) {
            workflowRoles.add(workflowRole);
            pushScopedRole(workflowRoleScopes, workflowRole, scope);
        }
    }

    if (compatibilityMode) {
        const headedOrganizations = await Organization.find({
            headUserId: new Types.ObjectId(actor.id),
            isActive: true,
        }).select("name type headTitle universityName collegeName");

        for (const organization of headedOrganizations) {
            const normalizedName = organization.name.toLowerCase();
            const normalizedTitle = String(organization.headTitle ?? "").toLowerCase();
            const scope = await resolveScopeFromOrganization(
                organization._id.toString(),
                {
                    source: "legacy",
                    sourceType: "LEGACY_HEAD",
                    organizationType: organization.type,
                    organizationName: organization.name,
                    universityName: organization.universityName,
                    collegeName: organization.collegeName,
                },
                organizationCache
            );

            if (!scope) {
                continue;
            }

            browseScopes.push(scope);

            if (organization.type === "Department") {
                workflowRoles.add("DEPARTMENT_HEAD");
                pushScopedRole(workflowRoleScopes, "DEPARTMENT_HEAD", scope);
            }

            if (organization.type === "Office") {
                workflowRoles.add("OFFICE_HEAD");
                pushScopedRole(workflowRoleScopes, "OFFICE_HEAD", scope);
            }

            if (normalizedName.includes("iqac") || normalizedTitle.includes("iqac")) {
                workflowRoles.add("IQAC");
                pushScopedRole(workflowRoleScopes, "IQAC", scope);
            }

            if (normalizedName.includes("principal") || normalizedTitle.includes("principal")) {
                workflowRoles.add("PRINCIPAL");
                pushScopedRole(workflowRoleScopes, "PRINCIPAL", scope);
            }

            if (normalizedName.includes("director") || normalizedTitle.includes("director")) {
                workflowRoles.add("DIRECTOR");
                pushScopedRole(workflowRoleScopes, "DIRECTOR", scope);
            }
        }
    }

    const dedupedScopes = dedupeScopes(browseScopes);
    const dedupedRoleScopes = Object.fromEntries(
        Object.entries(workflowRoleScopes).map(([role, scopes]) => [
            role,
            dedupeScopes(scopes ?? []),
        ])
    ) as Partial<Record<WorkflowApproverRole, AuthorizationScope[]>>;

    return {
        actorId: actor.id,
        actorRole: actor.role,
        isAdmin: actor.role === "Admin",
        isFaculty: actor.role === "Faculty",
        isStudent: actor.role === "Student",
        hasLeadershipPortalAccess: dedupedScopes.length > 0 || Object.keys(dedupedRoleScopes).length > 0,
        browseScopes: dedupedScopes,
        workflowRoles: Array.from(workflowRoles),
        workflowRoleScopes: dedupedRoleScopes,
    };
}

export function canUseBreakGlassOverride(
    actorOrProfile: AuthorizationActor | AuthorizationProfile,
    _moduleName?: WorkflowModuleName | "EVIDENCE"
) {
    return "isAdmin" in actorOrProfile ? actorOrProfile.isAdmin : actorOrProfile.role === "Admin";
}

export function canListModuleRecords(
    profile: AuthorizationProfile,
    _moduleName: WorkflowModuleName | "EVIDENCE"
) {
    if (profile.isAdmin || profile.isStudent) {
        return false;
    }

    return profile.hasLeadershipPortalAccess;
}

export function canViewModuleRecord(
    profile: AuthorizationProfile,
    _moduleName: WorkflowModuleName | "EVIDENCE",
    subjectScope: AuthorizationSubjectScope
) {
    if (profile.isAdmin) {
        return true;
    }

    return profile.browseScopes.some((scope) => subjectMatchesScope(subjectScope, scope));
}

export function canReviewWorkflowStage(
    profile: AuthorizationProfile,
    subjectScope: AuthorizationSubjectScope,
    approverRoles: WorkflowApproverRole[]
) {
    if (profile.isAdmin && approverRoles.includes("ADMIN")) {
        return true;
    }

    return approverRoles.some((role) => {
        if (!profile.workflowRoles.includes(role)) {
            return false;
        }

        const scopedRoles = profile.workflowRoleScopes[role] ?? [];
        if (!scopedRoles.length) {
            return false;
        }

        return scopedRoles.some((scope) => subjectMatchesScope(subjectScope, scope));
    });
}

export const canFinalizeWorkflowStage = canReviewWorkflowStage;

export function buildAuthorizedScopeQuery(profile: AuthorizationProfile) {
    if (!canListModuleRecords(profile, "PBAS")) {
        return { _id: { $in: [] as Types.ObjectId[] } };
    }

    const departmentIds = uniqueStrings(profile.browseScopes.map((scope) => scope.departmentId));
    const institutionIds = uniqueStrings(profile.browseScopes.map((scope) => scope.institutionId));
    const departmentOrganizationIds = uniqueStrings(
        profile.browseScopes.map((scope) => scope.departmentOrganizationId)
    );
    const collegeOrganizationIds = uniqueStrings(
        profile.browseScopes.map((scope) => scope.collegeOrganizationId)
    );
    const universityOrganizationIds = uniqueStrings(
        profile.browseScopes.map((scope) => scope.universityOrganizationId)
    );
    const organizationIds = uniqueStrings(profile.browseScopes.map((scope) => scope.organizationId));
    const departmentNames = uniqueStrings(
        profile.browseScopes
            .filter((scope) => scope.organizationType === "Department")
            .map((scope) => scope.organizationName)
    );
    const collegeNames = uniqueStrings(
        profile.browseScopes
            .map((scope) => scope.collegeName ?? (scope.organizationType === "College" ? scope.organizationName : undefined))
    );
    const universityNames = uniqueStrings(
        profile.browseScopes
            .map((scope) => scope.universityName ?? (scope.organizationType === "University" ? scope.organizationName : undefined))
    );
    const clauses: Record<string, unknown>[] = [];

    if (departmentIds.length) {
        clauses.push({ scopeDepartmentId: { $in: toObjectIdArray(departmentIds) } });
    }

    if (institutionIds.length) {
        clauses.push({ scopeInstitutionId: { $in: toObjectIdArray(institutionIds) } });
    }

    if (departmentOrganizationIds.length) {
        clauses.push({
            scopeDepartmentOrganizationId: { $in: toObjectIdArray(departmentOrganizationIds) },
        });
    }

    if (collegeOrganizationIds.length) {
        clauses.push({
            scopeCollegeOrganizationId: { $in: toObjectIdArray(collegeOrganizationIds) },
        });
    }

    if (universityOrganizationIds.length) {
        clauses.push({
            scopeUniversityOrganizationId: { $in: toObjectIdArray(universityOrganizationIds) },
        });
    }

    if (organizationIds.length) {
        clauses.push({ scopeOrganizationIds: { $in: toObjectIdArray(organizationIds) } });
    }

    if (departmentNames.length) {
        clauses.push({ scopeDepartmentName: { $in: departmentNames } });
    }

    if (collegeNames.length) {
        clauses.push({ scopeCollegeName: { $in: collegeNames } });
    }

    if (universityNames.length) {
        clauses.push({ scopeUniversityName: { $in: universityNames } });
    }

    return clauses.length ? { $or: clauses } : { _id: { $in: [] as Types.ObjectId[] } };
}

export async function resolveAuthorizedEvidenceDepartmentIds(profile: AuthorizationProfile) {
    if (!canListModuleRecords(profile, "EVIDENCE")) {
        return [];
    }

    await dbConnect();

    const departmentIds = new Set(uniqueStrings(profile.browseScopes.map((scope) => scope.departmentId)));
    const departmentOrganizationIds = uniqueStrings(
        profile.browseScopes.map((scope) => scope.departmentOrganizationId)
    );
    const collegeOrganizationIds = uniqueStrings(
        profile.browseScopes.map((scope) => scope.collegeOrganizationId)
    );
    const universityOrganizationIds = uniqueStrings(
        profile.browseScopes.map((scope) => scope.universityOrganizationId)
    );

    if (departmentOrganizationIds.length) {
        const departments = await Department.find({
            organizationId: { $in: toObjectIdArray(departmentOrganizationIds) },
        }).select("_id");

        for (const department of departments) {
            departmentIds.add(department._id.toString());
        }
    }

    if (collegeOrganizationIds.length || universityOrganizationIds.length) {
        const organizationFilters: Record<string, unknown>[] = [];
        const scopedUniversityNames = profile.browseScopes
            .map((scope) => scope.universityName)
            .filter((value): value is string => Boolean(value));

        if (collegeOrganizationIds.length) {
            organizationFilters.push({
                parentOrganizationId: { $in: toObjectIdArray(collegeOrganizationIds) },
                type: "Department",
            });
        }

        if (universityOrganizationIds.length) {
            organizationFilters.push({
                parentOrganizationId: { $in: toObjectIdArray(universityOrganizationIds) },
                type: "Department",
            });
            if (scopedUniversityNames.length) {
                organizationFilters.push({
                    type: "Department",
                    universityName: { $in: scopedUniversityNames },
                });
            }
        }

        const departmentOrganizations = await Organization.find({
            $or: organizationFilters,
        }).select("_id");

        if (departmentOrganizations.length) {
            const derivedDepartments = await Department.find({
                organizationId: {
                    $in: departmentOrganizations.map((organization) => organization._id),
                },
            }).select("_id");

            for (const department of derivedDepartments) {
                departmentIds.add(department._id.toString());
            }
        }
    }

    return Array.from(departmentIds);
}
