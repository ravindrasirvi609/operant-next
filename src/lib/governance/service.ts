import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import { createAuditLog, type AuditActor, type AuditRequestContext } from "@/lib/audit/service";
import Organization from "@/models/core/organization";
import User from "@/models/core/user";
import LeadershipAssignment, {
    type LeadershipAssignmentType,
} from "@/models/core/leadership-assignment";
import GovernanceCommittee, {
    type GovernanceCommitteeScopeType,
    type GovernanceCommitteeType,
} from "@/models/core/governance-committee";
import GovernanceCommitteeMembership from "@/models/core/governance-committee-membership";
import {
    governanceCommitteeMembershipSchema,
    governanceCommitteeMembershipUpdateSchema,
    governanceCommitteeSchema,
    governanceCommitteeUpdateSchema,
    leadershipAssignmentSchema,
    leadershipAssignmentUpdateSchema,
} from "@/lib/governance/validators";

type GovernanceOptions = {
    actor?: AuditActor;
    auditContext?: AuditRequestContext;
};

export type GovernanceSubjectScope = {
    departmentName?: string;
    collegeName?: string;
    universityName?: string;
};

type CommitteeScopeSnapshot = {
    organizationName?: string;
    organizationType?: string;
    collegeName?: string;
    universityName?: string;
};

const workflowCommitteeTypeByRole = {
    IQAC: ["IQAC"] as GovernanceCommitteeType[],
    PBAS_COMMITTEE: ["PBAS_REVIEW"] as GovernanceCommitteeType[],
    CAS_COMMITTEE: ["CAS_SCREENING"] as GovernanceCommitteeType[],
    AQAR_COMMITTEE: ["AQAR_REVIEW"] as GovernanceCommitteeType[],
    SSR_COMMITTEE: ["SSR_REVIEW"] as GovernanceCommitteeType[],
    TEACHING_LEARNING_COMMITTEE: ["TEACHING_LEARNING_REVIEW"] as GovernanceCommitteeType[],
    RESEARCH_COMMITTEE: ["RESEARCH_COMMITTEE"] as GovernanceCommitteeType[],
    INFRASTRUCTURE_LIBRARY_COMMITTEE: ["INFRASTRUCTURE_LIBRARY_REVIEW"] as GovernanceCommitteeType[],
    STUDENT_SUPPORT_GOVERNANCE_COMMITTEE: ["STUDENT_SUPPORT_GOVERNANCE_REVIEW"] as GovernanceCommitteeType[],
    BOARD_OF_STUDIES: ["BOARD_OF_STUDIES"] as GovernanceCommitteeType[],
} as const;

function normalizeTrimmed(value?: string | null) {
    return String(value ?? "").trim() || undefined;
}

function toOptionalDate(value?: string | null) {
    if (!value?.trim()) {
        return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new AuthError(`Invalid date value "${value}".`, 400);
    }

    return parsed;
}

function leadershipTypeMatchesOrganization(
    assignmentType: LeadershipAssignmentType,
    organizationType: string
) {
    if (assignmentType === "HOD") {
        return organizationType === "Department";
    }

    if (assignmentType === "PRINCIPAL") {
        return organizationType === "College" || organizationType === "University";
    }

    if (assignmentType === "IQAC_COORDINATOR") {
        return organizationType === "Office" || organizationType === "College" || organizationType === "University";
    }

    return true;
}

function committeeScopeMatchesOrganization(
    scopeType: GovernanceCommitteeScopeType,
    organizationType?: string
) {
    if (scopeType === "InstitutionWide") {
        return true;
    }

    return scopeType === organizationType;
}

function serializeLeadershipAssignment(assignment: Record<string, any>) {
    const user = assignment.userId as { _id?: Types.ObjectId; name?: string; email?: string; role?: string; designation?: string } | undefined;
    const organization = assignment.organizationId as { _id?: Types.ObjectId; name?: string; type?: string } | undefined;

    return {
        _id: String(assignment._id),
        userId: user?._id ? user._id.toString() : String(assignment.userId),
        userName: user?.name ?? "",
        userEmail: user?.email ?? "",
        userRole: user?.role ?? "",
        userDesignation: user?.designation ?? "",
        organizationId: organization?._id ? organization._id.toString() : String(assignment.organizationId),
        organizationName: (assignment.organizationName as string | undefined) ?? organization?.name ?? "",
        organizationType: (assignment.organizationType as string | undefined) ?? organization?.type ?? "",
        assignmentType: assignment.assignmentType,
        title: assignment.title,
        universityName: assignment.universityName,
        collegeName: assignment.collegeName,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        isPrimary: Boolean(assignment.isPrimary),
        isActive: Boolean(assignment.isActive),
        notes: assignment.notes,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
    };
}

function serializeCommittee(committee: Record<string, any>) {
    const organization = committee.organizationId as { _id?: Types.ObjectId; name?: string; type?: string } | undefined;

    return {
        _id: String(committee._id),
        name: committee.name,
        code: committee.code,
        committeeType: committee.committeeType,
        scopeType: committee.scopeType,
        organizationId: organization?._id ? organization._id.toString() : committee.organizationId ? String(committee.organizationId) : "",
        organizationName: committee.organizationName ?? organization?.name ?? "",
        organizationType: committee.organizationType ?? organization?.type ?? "",
        universityName: committee.universityName,
        collegeName: committee.collegeName,
        academicYearLabel: committee.academicYearLabel,
        description: committee.description,
        isActive: Boolean(committee.isActive),
        createdAt: committee.createdAt,
        updatedAt: committee.updatedAt,
    };
}

function serializeCommitteeMembership(membership: Record<string, any>) {
    const committee = membership.committeeId as { _id?: Types.ObjectId; name?: string; committeeType?: string; organizationName?: string } | undefined;
    const user = membership.userId as { _id?: Types.ObjectId; name?: string; email?: string; role?: string; designation?: string } | undefined;

    return {
        _id: String(membership._id),
        committeeId: committee?._id ? committee._id.toString() : String(membership.committeeId),
        committeeName: committee?.name ?? "",
        committeeType: committee?.committeeType ?? "",
        committeeOrganizationName: committee?.organizationName ?? "",
        userId: user?._id ? user._id.toString() : membership.userId ? String(membership.userId) : "",
        userName: user?.name ?? membership.memberName ?? "",
        userEmail: user?.email ?? membership.memberEmail ?? "",
        userRole: user?.role ?? "",
        userDesignation: user?.designation ?? "",
        memberName: membership.memberName,
        memberEmail: membership.memberEmail,
        memberRole: membership.memberRole,
        isExternal: Boolean(membership.isExternal),
        startDate: membership.startDate,
        endDate: membership.endDate,
        isActive: Boolean(membership.isActive),
        notes: membership.notes,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
    };
}

async function createAuditEntry(
    options: GovernanceOptions | undefined,
    action: string,
    tableName: string,
    recordId: string,
    oldData?: unknown,
    newData?: unknown
) {
    if (!options?.actor) {
        return;
    }

    await createAuditLog({
        actor: options.actor,
        action,
        tableName,
        recordId,
        oldData,
        newData,
        auditContext: options.auditContext,
    });
}

async function getOrganizationSnapshot(organizationId?: string) {
    if (!organizationId) {
        return null;
    }

    if (!Types.ObjectId.isValid(organizationId)) {
        throw new AuthError("Selected organization is invalid.", 400);
    }

    const organization = await Organization.findById(organizationId).select(
        "name type universityName collegeName parentOrganizationId parentOrganizationName"
    );

    if (!organization) {
        throw new AuthError("Selected organization was not found.", 404);
    }

    return organization;
}

async function getUserSnapshot(userId?: string) {
    if (!userId) {
        return null;
    }

    if (!Types.ObjectId.isValid(userId)) {
        throw new AuthError("Selected user is invalid.", 400);
    }

    const user = await User.findById(userId).select("name email role designation isActive accountStatus");

    if (!user) {
        throw new AuthError("Selected user was not found.", 404);
    }

    if (!user.isActive || user.accountStatus === "Suspended") {
        throw new AuthError("Selected user is not active.", 400);
    }

    return user;
}

export async function getGovernanceData() {
    await dbConnect();

    const [organizations, users, assignments, committees, memberships] = await Promise.all([
        Organization.find({ isActive: true }).sort({ hierarchyLevel: 1, name: 1 }).lean(),
        User.find({
            isActive: true,
            accountStatus: "Active",
            role: { $in: ["Admin", "Faculty"] },
        })
            .sort({ name: 1 })
            .select("name email role designation")
            .lean(),
        LeadershipAssignment.find()
            .sort({ isActive: -1, createdAt: -1 })
            .populate("userId", "name email role designation")
            .populate("organizationId", "name type")
            .lean(),
        GovernanceCommittee.find()
            .sort({ isActive: -1, committeeType: 1, name: 1 })
            .populate("organizationId", "name type")
            .lean(),
        GovernanceCommitteeMembership.find()
            .sort({ isActive: -1, createdAt: -1 })
            .populate("committeeId", "name committeeType organizationName")
            .populate("userId", "name email role designation")
            .lean(),
    ]);

    return {
        organizations,
        assignableUsers: users,
        assignments: assignments.map(serializeLeadershipAssignment),
        committees: committees.map(serializeCommittee),
        memberships: memberships.map(serializeCommitteeMembership),
    };
}

export async function createLeadershipAssignment(rawInput: unknown, options?: GovernanceOptions) {
    const input = leadershipAssignmentSchema.parse(rawInput);
    await dbConnect();

    const [user, organization] = await Promise.all([
        getUserSnapshot(input.userId),
        getOrganizationSnapshot(input.organizationId),
    ]);

    if (!user || !organization) {
        throw new AuthError("Unable to resolve assignment user or organization.", 400);
    }

    if (!leadershipTypeMatchesOrganization(input.assignmentType, organization.type)) {
        throw new AuthError(
            `${input.assignmentType} assignments are not valid for ${organization.type} organizations.`,
            400
        );
    }

    if (input.isPrimary) {
        await LeadershipAssignment.updateMany(
            {
                organizationId: organization._id,
                assignmentType: input.assignmentType,
                isActive: true,
            },
            { $set: { isPrimary: false } }
        );
    }

    const assignment = await LeadershipAssignment.create({
        userId: user._id,
        organizationId: organization._id,
        assignmentType: input.assignmentType,
        title: normalizeTrimmed(input.title),
        organizationName: organization.name,
        organizationType: organization.type,
        universityName: normalizeTrimmed(organization.universityName) ?? (organization.type === "University" ? organization.name : undefined),
        collegeName: normalizeTrimmed(organization.collegeName) ?? (organization.type === "College" ? organization.name : undefined),
        startDate: toOptionalDate(input.startDate),
        endDate: toOptionalDate(input.endDate),
        isPrimary: input.isPrimary,
        isActive: input.isActive,
        notes: normalizeTrimmed(input.notes),
    });

    const populated = await LeadershipAssignment.findById(assignment._id)
        .populate("userId", "name email role designation")
        .populate("organizationId", "name type")
        .lean();

    if (!populated) {
        throw new AuthError("Unable to load governance assignment after create.", 500);
    }

    await createAuditEntry(
        options,
        "LEADERSHIP_ASSIGNMENT_CREATE",
        "leadership_assignments",
        assignment._id.toString(),
        undefined,
        populated
    );

    return serializeLeadershipAssignment(populated);
}

export async function updateLeadershipAssignment(
    id: string,
    rawInput: unknown,
    options?: GovernanceOptions
) {
    const input = leadershipAssignmentUpdateSchema.parse(rawInput);
    await dbConnect();

    const assignment = await LeadershipAssignment.findById(id);
    if (!assignment) {
        throw new AuthError("Leadership assignment not found.", 404);
    }

    const oldState = assignment.toObject();

    const user = input.userId !== undefined ? await getUserSnapshot(input.userId) : null;
    const organization = input.organizationId !== undefined ? await getOrganizationSnapshot(input.organizationId) : null;

    const nextOrganizationType = organization?.type ?? assignment.organizationType;
    const nextAssignmentType = input.assignmentType ?? assignment.assignmentType;

    if (!leadershipTypeMatchesOrganization(nextAssignmentType, nextOrganizationType)) {
        throw new AuthError(
            `${nextAssignmentType} assignments are not valid for ${nextOrganizationType} organizations.`,
            400
        );
    }

    if (input.isPrimary) {
        await LeadershipAssignment.updateMany(
            {
                _id: { $ne: assignment._id },
                organizationId: organization?._id ?? assignment.organizationId,
                assignmentType: nextAssignmentType,
                isActive: true,
            },
            { $set: { isPrimary: false } }
        );
    }

    if (user) {
        assignment.userId = user._id;
    }

    if (organization) {
        assignment.organizationId = organization._id;
        assignment.organizationName = organization.name;
        assignment.organizationType = organization.type;
        assignment.universityName =
            normalizeTrimmed(organization.universityName) ?? (organization.type === "University" ? organization.name : undefined);
        assignment.collegeName =
            normalizeTrimmed(organization.collegeName) ?? (organization.type === "College" ? organization.name : undefined);
    }

    if (input.assignmentType !== undefined) assignment.assignmentType = input.assignmentType;
    if (input.title !== undefined) assignment.title = normalizeTrimmed(input.title);
    if (input.startDate !== undefined) assignment.startDate = toOptionalDate(input.startDate);
    if (input.endDate !== undefined) assignment.endDate = toOptionalDate(input.endDate);
    if (input.isPrimary !== undefined) assignment.isPrimary = input.isPrimary;
    if (input.isActive !== undefined) assignment.isActive = input.isActive;
    if (input.notes !== undefined) assignment.notes = normalizeTrimmed(input.notes);

    await assignment.save();

    const populated = await LeadershipAssignment.findById(assignment._id)
        .populate("userId", "name email role designation")
        .populate("organizationId", "name type")
        .lean();

    if (!populated) {
        throw new AuthError("Unable to load governance assignment after update.", 500);
    }

    await createAuditEntry(
        options,
        "LEADERSHIP_ASSIGNMENT_UPDATE",
        "leadership_assignments",
        assignment._id.toString(),
        oldState,
        populated
    );

    return serializeLeadershipAssignment(populated);
}

export async function createGovernanceCommittee(rawInput: unknown, options?: GovernanceOptions) {
    const input = governanceCommitteeSchema.parse(rawInput);
    await dbConnect();

    const organization = input.organizationId ? await getOrganizationSnapshot(input.organizationId) : null;

    if (!committeeScopeMatchesOrganization(input.scopeType, organization?.type)) {
        throw new AuthError("Committee scope type must match the selected organization.", 400);
    }

    const committee = await GovernanceCommittee.create({
        name: input.name,
        code: normalizeTrimmed(input.code),
        committeeType: input.committeeType,
        scopeType: input.scopeType,
        organizationId: organization?._id,
        organizationName: organization?.name,
        organizationType: organization?.type,
        universityName:
            normalizeTrimmed(organization?.universityName) ?? (organization?.type === "University" ? organization.name : undefined),
        collegeName:
            normalizeTrimmed(organization?.collegeName) ?? (organization?.type === "College" ? organization.name : undefined),
        academicYearLabel: normalizeTrimmed(input.academicYearLabel),
        description: normalizeTrimmed(input.description),
        isActive: input.isActive,
    });

    const populated = await GovernanceCommittee.findById(committee._id)
        .populate("organizationId", "name type")
        .lean();

    if (!populated) {
        throw new AuthError("Unable to load committee after create.", 500);
    }

    await createAuditEntry(
        options,
        "GOVERNANCE_COMMITTEE_CREATE",
        "governance_committees",
        committee._id.toString(),
        undefined,
        populated
    );

    return serializeCommittee(populated);
}

export async function updateGovernanceCommittee(
    id: string,
    rawInput: unknown,
    options?: GovernanceOptions
) {
    const input = governanceCommitteeUpdateSchema.parse(rawInput);
    await dbConnect();

    const committee = await GovernanceCommittee.findById(id);
    if (!committee) {
        throw new AuthError("Governance committee not found.", 404);
    }

    const oldState = committee.toObject();
    const organization = input.organizationId !== undefined ? await getOrganizationSnapshot(input.organizationId) : null;
    const nextScopeType = input.scopeType ?? committee.scopeType;

    if (!committeeScopeMatchesOrganization(nextScopeType, organization?.type ?? committee.organizationType)) {
        throw new AuthError("Committee scope type must match the selected organization.", 400);
    }

    if (organization) {
        committee.organizationId = organization._id;
        committee.organizationName = organization.name;
        committee.organizationType = organization.type;
        committee.universityName =
            normalizeTrimmed(organization.universityName) ?? (organization.type === "University" ? organization.name : undefined);
        committee.collegeName =
            normalizeTrimmed(organization.collegeName) ?? (organization.type === "College" ? organization.name : undefined);
    } else if (input.organizationId === "") {
        committee.organizationId = undefined;
        committee.organizationName = undefined;
        committee.organizationType = undefined;
        committee.universityName = undefined;
        committee.collegeName = undefined;
    }

    if (input.name !== undefined) committee.name = input.name;
    if (input.code !== undefined) committee.code = normalizeTrimmed(input.code);
    if (input.committeeType !== undefined) committee.committeeType = input.committeeType;
    if (input.scopeType !== undefined) committee.scopeType = input.scopeType;
    if (input.academicYearLabel !== undefined) committee.academicYearLabel = normalizeTrimmed(input.academicYearLabel);
    if (input.description !== undefined) committee.description = normalizeTrimmed(input.description);
    if (input.isActive !== undefined) committee.isActive = input.isActive;

    await committee.save();

    const populated = await GovernanceCommittee.findById(committee._id)
        .populate("organizationId", "name type")
        .lean();

    if (!populated) {
        throw new AuthError("Unable to load committee after update.", 500);
    }

    await createAuditEntry(
        options,
        "GOVERNANCE_COMMITTEE_UPDATE",
        "governance_committees",
        committee._id.toString(),
        oldState,
        populated
    );

    return serializeCommittee(populated);
}

export async function createGovernanceCommitteeMembership(
    rawInput: unknown,
    options?: GovernanceOptions
) {
    const input = governanceCommitteeMembershipSchema.parse(rawInput);
    await dbConnect();

    if (!Types.ObjectId.isValid(input.committeeId)) {
        throw new AuthError("Selected committee is invalid.", 400);
    }

    const committee = await GovernanceCommittee.findById(input.committeeId).select(
        "name committeeType organizationName"
    );
    if (!committee) {
        throw new AuthError("Selected committee was not found.", 404);
    }

    const user = input.userId ? await getUserSnapshot(input.userId) : null;
    const memberName = input.isExternal
        ? normalizeTrimmed(input.memberName)
        : normalizeTrimmed(user?.name);

    if (!memberName) {
        throw new AuthError("Committee member name is required.", 400);
    }

    const membership = await GovernanceCommitteeMembership.create({
        committeeId: committee._id,
        userId: user?._id,
        memberName,
        memberEmail: input.isExternal ? normalizeTrimmed(input.memberEmail) : normalizeTrimmed(user?.email),
        memberRole: input.memberRole,
        isExternal: input.isExternal,
        startDate: toOptionalDate(input.startDate),
        endDate: toOptionalDate(input.endDate),
        isActive: input.isActive,
        notes: normalizeTrimmed(input.notes),
    });

    const populated = await GovernanceCommitteeMembership.findById(membership._id)
        .populate("committeeId", "name committeeType organizationName")
        .populate("userId", "name email role designation")
        .lean();

    if (!populated) {
        throw new AuthError("Unable to load committee membership after create.", 500);
    }

    await createAuditEntry(
        options,
        "GOVERNANCE_COMMITTEE_MEMBERSHIP_CREATE",
        "governance_committee_memberships",
        membership._id.toString(),
        undefined,
        populated
    );

    return serializeCommitteeMembership(populated);
}

export async function updateGovernanceCommitteeMembership(
    id: string,
    rawInput: unknown,
    options?: GovernanceOptions
) {
    const input = governanceCommitteeMembershipUpdateSchema.parse(rawInput);
    await dbConnect();

    const membership = await GovernanceCommitteeMembership.findById(id);
    if (!membership) {
        throw new AuthError("Committee membership not found.", 404);
    }

    const oldState = membership.toObject();
    const user = input.userId !== undefined ? await getUserSnapshot(input.userId) : null;

    if (input.committeeId !== undefined) {
        if (!Types.ObjectId.isValid(input.committeeId)) {
            throw new AuthError("Selected committee is invalid.", 400);
        }

        const committee = await GovernanceCommittee.findById(input.committeeId).select("_id");
        if (!committee) {
            throw new AuthError("Selected committee was not found.", 404);
        }

        membership.committeeId = committee._id;
    }

    if (input.isExternal !== undefined) membership.isExternal = input.isExternal;
    if (input.memberRole !== undefined) membership.memberRole = input.memberRole;
    if (input.startDate !== undefined) membership.startDate = toOptionalDate(input.startDate);
    if (input.endDate !== undefined) membership.endDate = toOptionalDate(input.endDate);
    if (input.isActive !== undefined) membership.isActive = input.isActive;
    if (input.notes !== undefined) membership.notes = normalizeTrimmed(input.notes);

    if (user) {
        membership.userId = user._id;
        membership.memberName = user.name;
        membership.memberEmail = user.email;
        membership.isExternal = false;
    } else if (input.userId === "") {
        membership.userId = undefined;
    }

    if (input.memberName !== undefined) membership.memberName = normalizeTrimmed(input.memberName) ?? membership.memberName;
    if (input.memberEmail !== undefined) membership.memberEmail = normalizeTrimmed(input.memberEmail);

    await membership.save();

    const populated = await GovernanceCommitteeMembership.findById(membership._id)
        .populate("committeeId", "name committeeType organizationName")
        .populate("userId", "name email role designation")
        .lean();

    if (!populated) {
        throw new AuthError("Unable to load committee membership after update.", 500);
    }

    await createAuditEntry(
        options,
        "GOVERNANCE_COMMITTEE_MEMBERSHIP_UPDATE",
        "governance_committee_memberships",
        membership._id.toString(),
        oldState,
        populated
    );

    return serializeCommitteeMembership(populated);
}

export async function listActiveLeadershipAssignmentsForUser(userId: string) {
    await dbConnect();

    return LeadershipAssignment.find({
        userId: new Types.ObjectId(userId),
        isActive: true,
        $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: new Date() } }],
    })
        .select("assignmentType organizationName organizationType universityName collegeName")
        .lean();
}

export async function listActiveWorkflowCommitteeMembershipsForUser(userId: string) {
    await dbConnect();

    const memberships = await GovernanceCommitteeMembership.find({
        userId: new Types.ObjectId(userId),
        isActive: true,
        $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: new Date() } }],
    })
        .populate({
            path: "committeeId",
            select: "committeeType organizationName organizationType universityName collegeName isActive",
            match: {
                isActive: true,
                committeeType: {
                    $in: Array.from(new Set(Object.values(workflowCommitteeTypeByRole).flat())),
                },
            },
        })
        .select("memberRole")
        .lean();

    return memberships
        .map((membership) => membership.committeeId as CommitteeScopeSnapshot & { committeeType?: GovernanceCommitteeType } | null)
        .filter((committee): committee is CommitteeScopeSnapshot & { committeeType: GovernanceCommitteeType } => Boolean(committee?.committeeType));
}

function subjectMatchesCommitteeScope(subject: GovernanceSubjectScope, committee: CommitteeScopeSnapshot) {
    if (committee.organizationType === "Department") {
        return Boolean(subject.departmentName && committee.organizationName === subject.departmentName);
    }

    if (committee.organizationType === "College") {
        return Boolean(subject.collegeName && committee.organizationName === subject.collegeName);
    }

    if (committee.organizationType === "University") {
        return Boolean(subject.universityName && committee.organizationName === subject.universityName);
    }

    if (committee.collegeName && subject.collegeName) {
        return committee.collegeName === subject.collegeName;
    }

    if (committee.universityName && subject.universityName) {
        return committee.universityName === subject.universityName;
    }

    return true;
}

export function committeeTypesForWorkflowRole(role: string) {
    return workflowCommitteeTypeByRole[role as keyof typeof workflowCommitteeTypeByRole] ?? [];
}

export function mapLeadershipAssignmentTypeToWorkflowRoles(assignmentType: LeadershipAssignmentType) {
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

export async function hasGovernancePortalAccess(userId: string) {
    await dbConnect();

    const [assignmentCount, membershipCount] = await Promise.all([
        LeadershipAssignment.countDocuments({
            userId: new Types.ObjectId(userId),
            isActive: true,
            $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: new Date() } }],
        }),
        GovernanceCommitteeMembership.countDocuments({
            userId: new Types.ObjectId(userId),
            isActive: true,
            $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: new Date() } }],
        }),
    ]);

    return assignmentCount > 0 || membershipCount > 0;
}

export async function resolveWorkflowCommitteeRecipientIds(
    committeeTypes: GovernanceCommitteeType[],
    subject: GovernanceSubjectScope
) {
    await dbConnect();

    const committees = await GovernanceCommittee.find({
        isActive: true,
        committeeType: { $in: committeeTypes },
    })
        .select("organizationName organizationType collegeName universityName")
        .lean();

    const scopedCommittees = committees.filter((committee) =>
        subjectMatchesCommitteeScope(subject, committee)
    );

    if (!scopedCommittees.length) {
        return [];
    }

    const memberships = await GovernanceCommitteeMembership.find({
        committeeId: { $in: scopedCommittees.map((committee) => committee._id) },
        isActive: true,
        userId: { $exists: true },
    }).select("userId");

    return memberships
        .map((membership) => membership.userId?.toString())
        .filter((value): value is string => Boolean(value));
}

export async function resolveLeadershipRecipientIds(
    assignmentType: LeadershipAssignmentType,
    subject: GovernanceSubjectScope
) {
    await dbConnect();

    const assignments = await LeadershipAssignment.find({
        assignmentType,
        isActive: true,
    })
        .select("userId organizationName organizationType collegeName universityName")
        .lean();

    return assignments
        .filter((assignment) =>
            matchesScopedAssignment(
                subject,
                {
                    departmentName:
                        assignment.assignmentType === "HOD" ? assignment.organizationName : undefined,
                    collegeName:
                        assignment.assignmentType === "PRINCIPAL"
                            ? assignment.collegeName || assignment.organizationName
                            : assignment.collegeName,
                    universityName: assignment.universityName,
                }
            )
        )
        .map((assignment) => assignment.userId?.toString())
        .filter((value): value is string => Boolean(value));
}

export async function resolveWorkflowRoleRecipientIds(
    role: string,
    subject: GovernanceSubjectScope
) {
    if (role === "DEPARTMENT_HEAD") {
        return resolveLeadershipRecipientIds("HOD", subject);
    }

    if (role === "PRINCIPAL") {
        return resolveLeadershipRecipientIds("PRINCIPAL", subject);
    }

    if (role === "OFFICE_HEAD") {
        return resolveLeadershipRecipientIds("OFFICE_HEAD", subject);
    }

    return resolveWorkflowCommitteeRecipientIds(committeeTypesForWorkflowRole(role), subject);
}

function matchesScopedAssignment(
    subject: GovernanceSubjectScope,
    scope: GovernanceSubjectScope
) {
    if (scope.departmentName) {
        return scope.departmentName === subject.departmentName;
    }

    if (scope.collegeName) {
        return scope.collegeName === subject.collegeName;
    }

    if (scope.universityName) {
        return scope.universityName === subject.universityName;
    }

    return true;
}
