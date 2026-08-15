import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import { createAuditLog, type AuditActor, type AuditRequestContext } from "@/lib/audit/service";
import Student from "@/models/student/student";
import User from "@/models/core/user";
import Institution from "@/models/reference/institution";
import Alumni from "@/models/alumni/alumni";
import AlumniAssociation from "@/models/alumni/alumni-association";
import AlumniContribution from "@/models/alumni/alumni-contribution";
import {
    alumniAssociationSchema,
    alumniAssociationUpdateSchema,
    alumniContributionSchema,
    alumniProfileUpdateSchema,
    alumniPromotionSchema,
} from "@/lib/alumni/validators";

function ensureAdminActor(actor: AuditActor) {
    if (actor.role !== "Admin") {
        throw new AuthError("Admin access is required.", 403);
    }
}

function toOptionalDate(value?: string) {
    if (!value?.trim()) {
        return undefined;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function promoteStudentToAlumni(
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();
    const input = alumniPromotionSchema.parse(rawInput);

    const student = await Student.findById(input.studentId);
    if (!student) {
        throw new AuthError("Student not found.", 404);
    }
    if (student.status !== "Graduated") {
        throw new AuthError("Only graduated students can be promoted to alumni.", 409);
    }
    if (!student.email) {
        throw new AuthError("Student record has no email on file; cannot provision an alumni login.", 400);
    }

    const existingAlumni = await Alumni.findOne({ sourceStudentId: student._id });
    if (existingAlumni) {
        throw new AuthError("This student has already been promoted to an alumni record.", 409);
    }

    const email = student.email.toLowerCase();
    const existingUser = await User.findOne({ email }).select("_id");
    if (existingUser) {
        throw new AuthError("A UMIS user account already exists for that email.", 409);
    }

    const fullName = [student.firstName, student.lastName].filter(Boolean).join(" ");

    const alumni = await Alumni.create({
        sourceStudentId: student._id,
        enrollmentNo: student.enrollmentNo,
        firstName: student.firstName,
        lastName: student.lastName,
        gender: student.gender,
        dob: student.dob,
        email: student.email,
        mobile: student.mobile,
        institutionId: student.institutionId,
        departmentId: student.departmentId,
        programId: student.programId,
        graduationYear: input.graduationYear ?? new Date().getFullYear(),
        status: "Active",
    });

    const user = await User.create({
        name: fullName,
        email,
        role: "Alumni",
        accountStatus: "PendingActivation",
        phone: student.mobile,
        institutionId: student.institutionId,
        departmentId: student.departmentId,
        alumniId: alumni._id,
        experience: [],
        emailVerified: true,
        isActive: true,
    });

    alumni.userId = user._id;
    await alumni.save();

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "USER_PROVISION_ALUMNI",
            tableName: "users",
            recordId: user._id.toString(),
            newData: { alumni, user },
            auditContext: options.auditContext,
        });
    }

    return { alumni, user };
}

export type AlumniPromotionBulkFailure = {
    studentId: string;
    enrollmentNo?: string;
    message: string;
};

export async function promoteGraduatedStudentsBulk(options?: {
    actor?: AuditActor;
    auditContext?: AuditRequestContext;
}) {
    await dbConnect();

    const [graduatedStudents, alreadyPromotedStudentIds] = await Promise.all([
        Student.find({ status: "Graduated" }).select("_id enrollmentNo").lean(),
        Alumni.distinct("sourceStudentId"),
    ]);

    const promotedSet = new Set(alreadyPromotedStudentIds.map((id) => id.toString()));
    const candidates = graduatedStudents.filter((student) => !promotedSet.has(student._id.toString()));

    const created: Array<Awaited<ReturnType<typeof promoteStudentToAlumni>>> = [];
    const failed: AlumniPromotionBulkFailure[] = [];

    for (const candidate of candidates) {
        try {
            const result = await promoteStudentToAlumni({ studentId: candidate._id.toString() }, options);
            created.push(result);
        } catch (error) {
            failed.push({
                studentId: candidate._id.toString(),
                enrollmentNo: candidate.enrollmentNo,
                message: error instanceof AuthError ? error.message : "Promotion failed.",
            });
        }
    }

    return { created, failed };
}

export async function getAlumniAssociation(institutionId: string) {
    await dbConnect();
    return AlumniAssociation.findOne({ institutionId: new Types.ObjectId(institutionId) }).lean();
}

export async function upsertAlumniAssociation(actor: AuditActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = alumniAssociationSchema.parse(rawInput);
    const institutionId = new Types.ObjectId(input.institutionId);

    const association = await AlumniAssociation.findOneAndUpdate(
        { institutionId },
        {
            $set: {
                name: input.name,
                isRegistered: input.isRegistered,
                registrationDate: toOptionalDate(input.registrationDate),
                isFunctional: input.isFunctional,
                description: input.description || undefined,
                contactPersonName: input.contactPersonName || undefined,
                contactEmail: input.contactEmail || undefined,
                website: input.website || undefined,
            },
        },
        { upsert: true, returnDocument: "after" }
    );

    await createAuditLog({
        actor,
        action: "ALUMNI_ASSOCIATION_UPSERT",
        tableName: "alumni_associations",
        recordId: association!._id.toString(),
        newData: association,
    });

    return association!;
}

export async function updateAlumniAssociation(actor: AuditActor, institutionId: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = alumniAssociationUpdateSchema.parse(rawInput);
    const association = await AlumniAssociation.findOne({ institutionId: new Types.ObjectId(institutionId) });
    if (!association) {
        throw new AuthError("Alumni association record not found for this institution.", 404);
    }

    if (input.name !== undefined) association.name = input.name;
    if (input.isRegistered !== undefined) association.isRegistered = input.isRegistered;
    if (input.registrationDate !== undefined) association.registrationDate = toOptionalDate(input.registrationDate);
    if (input.isFunctional !== undefined) association.isFunctional = input.isFunctional;
    if (input.description !== undefined) association.description = input.description || undefined;
    if (input.contactPersonName !== undefined) association.contactPersonName = input.contactPersonName || undefined;
    if (input.contactEmail !== undefined) association.contactEmail = input.contactEmail || undefined;
    if (input.website !== undefined) association.website = input.website || undefined;
    await association.save();

    await createAuditLog({
        actor,
        action: "ALUMNI_ASSOCIATION_UPDATE",
        tableName: "alumni_associations",
        recordId: association._id.toString(),
        newData: association,
    });

    return association;
}

export async function createAlumniContribution(actor: AuditActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = alumniContributionSchema.parse(rawInput);

    const association = await AlumniAssociation.findById(input.associationId).select("_id");
    if (!association) {
        throw new AuthError("Alumni association not found.", 404);
    }

    let alumniId: Types.ObjectId | undefined;
    if (input.alumniId) {
        const alumni = await Alumni.findById(input.alumniId).select("_id");
        if (!alumni) {
            throw new AuthError("Linked alumni record was not found.", 404);
        }
        alumniId = alumni._id;
    }

    const contribution = await AlumniContribution.create({
        associationId: association._id,
        alumniId,
        alumniName: input.alumniName,
        contributionType: input.contributionType,
        contributionBand: input.contributionBand,
        amount: input.amount,
        purposeDescription: input.purposeDescription || undefined,
        contributionYear: input.contributionYear,
        documentId: input.documentId ? new Types.ObjectId(input.documentId) : undefined,
        recordedByUserId: new Types.ObjectId(actor.id),
    });

    await createAuditLog({
        actor,
        action: "ALUMNI_CONTRIBUTION_CREATE",
        tableName: "alumni_contributions",
        recordId: contribution._id.toString(),
        newData: contribution,
    });

    return contribution;
}

export async function listAlumniContributions(associationId?: string) {
    await dbConnect();
    return AlumniContribution.find(associationId ? { associationId: new Types.ObjectId(associationId) } : {})
        .sort({ contributionYear: -1, createdAt: -1 })
        .lean();
}

/** Mirrors `resolveStudent` in records-service.ts for the Alumni self-service surface. */
export async function resolveAlumniForUser(userId: string) {
    await dbConnect();
    const user = await User.findById(userId);
    if (!user || user.role !== "Alumni") {
        throw new AuthError("Alumni account not found.", 404);
    }

    const alumni =
        (user.alumniId ? await Alumni.findById(user.alumniId) : await Alumni.findOne({ userId: user._id })) ?? null;
    if (!alumni) {
        throw new AuthError("Alumni record not found.", 404);
    }

    return { user, alumni };
}

export async function getAlumniAdminConsole(actor: AuditActor) {
    ensureAdminActor(actor);
    await dbConnect();

    const [institutions, promotedStudentIds, graduatedStudents, alumniList, associations, contributions] =
        await Promise.all([
            Institution.find({}).sort({ name: 1 }).select("_id name").lean(),
            Alumni.distinct("sourceStudentId"),
            Student.find({ status: "Graduated" })
                .sort({ firstName: 1 })
                .select("_id firstName lastName enrollmentNo email")
                .lean(),
            Alumni.find({}).sort({ createdAt: -1 }).lean(),
            AlumniAssociation.find({}).sort({ name: 1 }).lean(),
            AlumniContribution.find({}).sort({ contributionYear: -1, createdAt: -1 }).lean(),
        ]);

    const promotedSet = new Set(promotedStudentIds.map((id) => id.toString()));

    return {
        institutionOptions: institutions.map((item) => ({ id: item._id.toString(), label: item.name })),
        graduatedStudentsPendingPromotion: graduatedStudents
            .filter((student) => !promotedSet.has(student._id.toString()))
            .map((student) => ({
                id: student._id.toString(),
                enrollmentNo: student.enrollmentNo,
                name: [student.firstName, student.lastName].filter(Boolean).join(" "),
                email: student.email,
            })),
        alumniList: alumniList.map((alumni) => ({
            id: alumni._id.toString(),
            enrollmentNo: alumni.enrollmentNo,
            name: [alumni.firstName, alumni.lastName].filter(Boolean).join(" "),
            graduationYear: alumni.graduationYear,
            status: alumni.status,
            currentEmployer: alumni.currentEmployer,
        })),
        associations,
        contributions,
    };
}

export async function getAlumniProfile(userId: string) {
    const { user, alumni } = await resolveAlumniForUser(userId);
    return { user, alumni };
}

export async function updateAlumniProfile(userId: string, rawInput: unknown) {
    const { alumni } = await resolveAlumniForUser(userId);
    const input = alumniProfileUpdateSchema.parse(rawInput);

    if (input.mobile !== undefined) alumni.mobile = input.mobile;
    if (input.currentEmployer !== undefined) alumni.currentEmployer = input.currentEmployer || undefined;
    if (input.currentDesignation !== undefined) alumni.currentDesignation = input.currentDesignation || undefined;
    await alumni.save();

    return alumni;
}

export async function deleteAlumniContribution(actor: AuditActor, id: string) {
    ensureAdminActor(actor);
    await dbConnect();

    const contribution = await AlumniContribution.findByIdAndDelete(id);
    if (!contribution) {
        throw new AuthError("Contribution record not found.", 404);
    }

    await createAuditLog({
        actor,
        action: "ALUMNI_CONTRIBUTION_DELETE",
        tableName: "alumni_contributions",
        recordId: id,
        oldData: contribution,
    });

    return { deleted: true };
}
