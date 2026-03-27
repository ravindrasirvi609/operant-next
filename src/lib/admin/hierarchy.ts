import { Types } from "mongoose";

import { createAuditLog, type AuditActor, type AuditRequestContext } from "@/lib/audit/service";
import {
    organizationSchema,
    organizationTypes,
    organizationUpdateSchema,
} from "@/lib/admin/hierarchy-validators";
import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import { syncOrganizationProjection } from "@/lib/hierarchy/canonical";
import Organization, { type IOrganization, type OrganizationType } from "@/models/core/organization";
import User from "@/models/core/user";

function buildHierarchyValues(
    type: OrganizationType,
    name: string,
    parent?: IOrganization | null
) {
    const hierarchyLevel = parent ? parent.hierarchyLevel + 1 : 1;

    if (type === "University") {
        return {
            hierarchyLevel: 1,
            universityName: name,
            collegeName: undefined,
        };
    }

    if (type === "College") {
        return {
            hierarchyLevel,
            universityName:
                parent?.type === "University"
                    ? parent.name
                    : parent?.universityName,
            collegeName: name,
        };
    }

    return {
        hierarchyLevel,
        universityName: parent?.universityName,
        collegeName:
            parent?.type === "College" ? parent.name : parent?.collegeName,
    };
}

async function getHeadSnapshot(headUserId?: string) {
    if (!headUserId) {
        return {
            headUserId: undefined,
            headName: undefined,
            headEmail: undefined,
        };
    }

    const user = await User.findById(headUserId).select("name email");

    if (!user) {
        throw new AuthError("Selected head user was not found.", 404);
    }

    return {
        headUserId: user._id,
        headName: user.name,
        headEmail: user.email,
    };
}

export async function getHierarchyData() {
    await dbConnect();

    const [organizations, users] = await Promise.all([
        Organization.find().sort({ hierarchyLevel: 1, type: 1, name: 1 }),
        User.find({
            isActive: true,
            emailVerified: true,
            role: { $in: ["Admin", "Faculty"] },
        })
            .sort({ role: 1, name: 1 })
            .select("name email role universityName collegeName department designation"),
    ]);

    return {
        organizations,
        assignableUsers: users,
        organizationTypes,
    };
}

export async function createOrganization(
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    const input = organizationSchema.parse(rawInput);

    await dbConnect();

    const parent =
        input.parentOrganizationId && Types.ObjectId.isValid(input.parentOrganizationId)
            ? await Organization.findById(input.parentOrganizationId)
            : null;

    const hierarchy = buildHierarchyValues(input.type, input.name, parent);
    const head = await getHeadSnapshot(input.headUserId);

    const organization = await Organization.create({
        name: input.name,
        type: input.type,
        code: input.code || undefined,
        shortName: input.shortName || undefined,
        description: input.description || undefined,
        parentOrganizationId: parent?._id,
        parentOrganizationName: parent?.name,
        hierarchyLevel: hierarchy.hierarchyLevel,
        universityName: hierarchy.universityName,
        collegeName: hierarchy.collegeName,
        ...head,
        headTitle: input.headTitle || undefined,
        email: input.email || undefined,
        phone: input.phone || undefined,
        website: input.website || undefined,
        isActive: input.isActive,
    });

    await syncOrganizationProjection(organization);

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "ORGANIZATION_CREATE",
            tableName: "organizations",
            recordId: organization._id.toString(),
            newData: organization,
            auditContext: options.auditContext,
        });
    }

    return organization;
}

export async function updateOrganization(
    id: string,
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    const input = organizationUpdateSchema.parse(rawInput);

    await dbConnect();

    const organization = await Organization.findById(id);

    if (!organization) {
        throw new AuthError("Organization not found.", 404);
    }

    const oldState = organization.toObject();

    const parent =
        input.parentOrganizationId && Types.ObjectId.isValid(input.parentOrganizationId)
            ? await Organization.findById(input.parentOrganizationId)
            : input.parentOrganizationId === ""
              ? null
              : organization.parentOrganizationId
                ? await Organization.findById(organization.parentOrganizationId)
                : null;

    const nextType = input.type ?? organization.type;
    const nextName = input.name ?? organization.name;
    const hierarchy = buildHierarchyValues(nextType, nextName, parent);
    const head =
        input.headUserId !== undefined
            ? await getHeadSnapshot(input.headUserId)
            : {
                  headUserId: organization.headUserId,
                  headName: organization.headName,
                  headEmail: organization.headEmail,
              };

    organization.name = nextName;
    organization.type = nextType;
    organization.code = input.code !== undefined ? input.code || undefined : organization.code;
    organization.shortName =
        input.shortName !== undefined ? input.shortName || undefined : organization.shortName;
    organization.description =
        input.description !== undefined
            ? input.description || undefined
            : organization.description;
    organization.parentOrganizationId = parent?._id;
    organization.parentOrganizationName = parent?.name;
    organization.hierarchyLevel = hierarchy.hierarchyLevel;
    organization.universityName = hierarchy.universityName;
    organization.collegeName = hierarchy.collegeName;
    organization.headUserId = head.headUserId;
    organization.headName = head.headName;
    organization.headEmail = head.headEmail;
    organization.headTitle =
        input.headTitle !== undefined ? input.headTitle || undefined : organization.headTitle;
    organization.email = input.email !== undefined ? input.email || undefined : organization.email;
    organization.phone = input.phone !== undefined ? input.phone || undefined : organization.phone;
    organization.website =
        input.website !== undefined ? input.website || undefined : organization.website;
    if (input.isActive !== undefined) {
        organization.isActive = input.isActive;
    }

    await organization.save();
    await syncOrganizationProjection(organization);

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "ORGANIZATION_UPDATE",
            tableName: "organizations",
            recordId: organization._id.toString(),
            oldData: oldState,
            newData: organization.toObject(),
            auditContext: options.auditContext,
        });
    }

    return organization;
}
