import type mongoose from "mongoose";

import dbConnect from "@/lib/dbConnect";
import Organization from "@/models/core/organization";
import Department from "@/models/reference/department";
import Institution from "@/models/reference/institution";

export type HierarchyOption = {
    key: string;
    label: string;
    code?: string;
};

type HierarchySession = mongoose.mongo.ClientSession;

function isDuplicateKeyError(error: unknown) {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === 11000
    );
}

async function findOrganizationWithRetry(
    filter: Record<string, unknown>,
    session?: HierarchySession
) {
    const withSession = await Organization.findOne(filter).session(session ?? null);
    if (withSession) {
        return withSession;
    }

    if (!session) {
        return null;
    }

    // If another transaction committed this row after the current snapshot,
    // a non-session read can still resolve the existing document.
    return Organization.findOne(filter);
}

function normalizeName(value?: string | null) {
    return String(value ?? "").trim();
}

async function upsertUniversityOrganization(
    universityName: string,
    session?: HierarchySession
) {
    const name = normalizeName(universityName);
    if (!name) {
        return null;
    }

    const lookup = {
        type: "University",
        name,
    };

    let organization = await findOrganizationWithRetry(lookup, session);

    if (!organization) {
        try {
            organization = await Organization.create(
                [
                    {
                        name,
                        type: "University",
                        hierarchyLevel: 1,
                        universityName: name,
                        isActive: true,
                    },
                ],
                session ? { session } : undefined
            ).then((docs) => docs[0]);
        } catch (error) {
            if (!isDuplicateKeyError(error)) {
                throw error;
            }

            organization = await findOrganizationWithRetry(lookup, session);
        }
    }

    return organization;
}

async function upsertCollegeOrganization(
    universityOrganizationId: string | undefined,
    universityName: string | undefined,
    collegeName: string,
    session?: HierarchySession
) {
    const name = normalizeName(collegeName);
    if (!name) {
        return null;
    }

    const contextualLookup = {
        type: "College",
        name,
        universityName,
    };
    const fallbackLookup = {
        type: "College",
        name,
    };

    let organization = await findOrganizationWithRetry(contextualLookup, session);

    if (!organization) {
        organization = await findOrganizationWithRetry(fallbackLookup, session);
    }

    if (!organization) {
        try {
            organization = await Organization.create(
                [
                    {
                        name,
                        type: "College",
                        parentOrganizationId: universityOrganizationId,
                        parentOrganizationName: universityName,
                        hierarchyLevel: 2,
                        universityName,
                        collegeName: name,
                        isActive: true,
                    },
                ],
                session ? { session } : undefined
            ).then((docs) => docs[0]);
        } catch (error) {
            if (!isDuplicateKeyError(error)) {
                throw error;
            }

            organization =
                (await findOrganizationWithRetry(contextualLookup, session)) ??
                (await findOrganizationWithRetry(fallbackLookup, session));
        }
    }

    if (!organization) {
        return null;
    }

    const nextUniversityName = normalizeName(universityName);
    const nextParentId = normalizeName(universityOrganizationId);
    const updates: Record<string, unknown> = {};

    if (!normalizeName(organization.universityName) && nextUniversityName) {
        updates.universityName = nextUniversityName;
    }

    if (!normalizeName(organization.parentOrganizationName) && nextUniversityName) {
        updates.parentOrganizationName = nextUniversityName;
    }

    if (!organization.parentOrganizationId && nextParentId) {
        updates.parentOrganizationId = nextParentId;
    }

    if (!Object.keys(updates).length) {
        return organization;
    }

    const updated = await Organization.findByIdAndUpdate(
        organization._id,
        { $set: updates },
        {
            returnDocument: "after",
            ...(session ? { session } : {}),
        }
    );

    return updated ?? organization;
}

async function upsertDepartmentOrganization(
    input: {
        departmentName: string;
        universityName?: string;
        collegeOrganizationId?: string;
        collegeName?: string;
        universityOrganizationId?: string;
    },
    session?: HierarchySession
) {
    const name = normalizeName(input.departmentName);
    if (!name) {
        return null;
    }

    const contextualLookup = {
        type: "Department",
        name,
        universityName: input.universityName,
        collegeName: input.collegeName,
    };
    const fallbackLookup = {
        type: "Department",
        name,
    };

    let organization = await findOrganizationWithRetry(contextualLookup, session);

    if (!organization) {
        organization = await findOrganizationWithRetry(fallbackLookup, session);
    }

    const parentOrganizationId = input.collegeOrganizationId ?? input.universityOrganizationId;
    const parentOrganizationName = input.collegeName ?? input.universityName;
    const hierarchyLevel = input.collegeOrganizationId ? 3 : 2;

    if (!organization) {
        try {
            organization = await Organization.create(
                [
                    {
                        name,
                        type: "Department",
                        parentOrganizationId,
                        parentOrganizationName,
                        hierarchyLevel,
                        universityName: input.universityName,
                        collegeName: input.collegeName,
                        isActive: true,
                    },
                ],
                session ? { session } : undefined
            ).then((docs) => docs[0]);
        } catch (error) {
            if (!isDuplicateKeyError(error)) {
                throw error;
            }

            organization =
                (await findOrganizationWithRetry(contextualLookup, session)) ??
                (await findOrganizationWithRetry(fallbackLookup, session));
        }
    }

    if (!organization) {
        return null;
    }

    const updates: Record<string, unknown> = {};
    const nextUniversityName = normalizeName(input.universityName);
    const nextCollegeName = normalizeName(input.collegeName);
    const nextParentName = normalizeName(parentOrganizationName);
    const nextParentId = normalizeName(parentOrganizationId);

    if (!normalizeName(organization.universityName) && nextUniversityName) {
        updates.universityName = nextUniversityName;
    }

    if (!normalizeName(organization.collegeName) && nextCollegeName) {
        updates.collegeName = nextCollegeName;
    }

    if (!normalizeName(organization.parentOrganizationName) && nextParentName) {
        updates.parentOrganizationName = nextParentName;
    }

    if (!organization.parentOrganizationId && nextParentId) {
        updates.parentOrganizationId = nextParentId;
    }

    if (!organization.hierarchyLevel && hierarchyLevel) {
        updates.hierarchyLevel = hierarchyLevel;
    }

    if (!Object.keys(updates).length) {
        return organization;
    }

    const updated = await Organization.findByIdAndUpdate(
        organization._id,
        { $set: updates },
        {
            returnDocument: "after",
            ...(session ? { session } : {}),
        }
    );

    return updated ?? organization;
}

async function syncUniversityProjection(
    organization: InstanceType<typeof Organization>,
    session?: HierarchySession
) {
    return Institution.findOneAndUpdate(
        {
            $or: [{ organizationId: organization._id }, { name: organization.name }],
        },
        {
            $set: {
                organizationId: organization._id,
                name: organization.name,
                code: organization.code || undefined,
                email: organization.email || undefined,
                phone: organization.phone || undefined,
            },
        },
        { upsert: true, returnDocument: "after", session }
    );
}

async function syncDepartmentProjection(
    organization: InstanceType<typeof Organization>,
    session?: HierarchySession
) {
    const universityName = normalizeName(organization.universityName);
    if (!universityName) {
        throw new Error(`Department "${organization.name}" is missing university context.`);
    }

    const universityOrganization =
        (await Organization.findOne({
            type: "University",
            name: universityName,
        }).session(session ?? null)) ??
        (await upsertUniversityOrganization(universityName, session));

    if (!universityOrganization) {
        throw new Error(`Unable to resolve university organization for "${organization.name}".`);
    }

    const institution = await syncUniversityProjection(universityOrganization, session);

    return Department.findOneAndUpdate(
        {
            $or: [
                { organizationId: organization._id },
                { institutionId: institution._id, name: organization.name },
            ],
        },
        {
            $set: {
                organizationId: organization._id,
                institutionId: institution._id,
                name: organization.name,
                code: organization.code || undefined,
                hodName: organization.headName || undefined,
            },
        },
        { upsert: true, returnDocument: "after", session }
    );
}

export async function syncOrganizationProjection(
    organization: InstanceType<typeof Organization>,
    session?: HierarchySession
) {
    if (organization.type === "University") {
        return syncUniversityProjection(organization, session);
    }

    if (organization.type === "Department") {
        return syncDepartmentProjection(organization, session);
    }

    return null;
}

export async function ensureCanonicalHierarchyPath(
    input: {
        universityName: string;
        collegeName?: string;
        departmentName: string;
    },
    session?: HierarchySession
) {
    const universityName = normalizeName(input.universityName);
    const collegeName = normalizeName(input.collegeName);
    const departmentName = normalizeName(input.departmentName);

    if (!universityName) {
        throw new Error("University name is required.");
    }

    if (!departmentName) {
        throw new Error("Department name is required.");
    }

    const universityOrganization = await upsertUniversityOrganization(universityName, session);
    if (!universityOrganization) {
        throw new Error("Unable to create canonical university organization.");
    }

    const collegeOrganization = collegeName
        ? await upsertCollegeOrganization(
              universityOrganization._id.toString(),
              universityOrganization.name,
              collegeName,
              session
          )
        : null;

    const departmentOrganization = await upsertDepartmentOrganization(
        {
            departmentName,
            universityName: universityOrganization.name,
            universityOrganizationId: universityOrganization._id.toString(),
            collegeName: collegeOrganization?.name,
            collegeOrganizationId: collegeOrganization?._id.toString(),
        },
        session
    );

    if (!departmentOrganization) {
        throw new Error("Unable to create canonical department organization.");
    }

    const institution = await syncUniversityProjection(universityOrganization, session);
    const department = await syncDepartmentProjection(departmentOrganization, session);

    return {
        universityOrganization,
        collegeOrganization,
        departmentOrganization,
        institution,
        department,
    };
}

export async function ensureCanonicalUniversityProjection(
    universityName: string,
    session?: HierarchySession
) {
    const normalizedUniversityName = normalizeName(universityName);
    if (!normalizedUniversityName) {
        throw new Error("University name is required.");
    }

    const universityOrganization = await upsertUniversityOrganization(
        normalizedUniversityName,
        session
    );

    if (!universityOrganization) {
        throw new Error("Unable to create canonical university organization.");
    }

    const institution = await syncUniversityProjection(universityOrganization, session);

    return {
        universityOrganization,
        institution,
    };
}

export async function getCanonicalHierarchyOptions(categories: string[]) {
    await dbConnect();

    const typeMapping = new Map<string, "University" | "College" | "Department">([
        ["university", "University"],
        ["college", "College"],
        ["department", "Department"],
    ]);

    const requestedTypes = Array.from(
        new Set(
            categories
                .map((category) => typeMapping.get(category))
                .filter((value): value is "University" | "College" | "Department" => Boolean(value))
        )
    );

    if (!requestedTypes.length) {
        return {};
    }

    const organizations = await Organization.find({
        type: { $in: requestedTypes },
        isActive: true,
    })
        .sort({ type: 1, name: 1 })
        .select("type name code");

    return categories.reduce<Record<string, HierarchyOption[]>>((accumulator, category) => {
        const type = typeMapping.get(category);
        if (!type) {
            return accumulator;
        }

        accumulator[category] = organizations
            .filter((organization) => organization.type === type)
            .map((organization) => ({
                key: organization._id.toString(),
                label: organization.name,
                code: organization.code || undefined,
            }));

        return accumulator;
    }, {});
}
