import mongoose from "mongoose";

import { createAuditLog, type AuditActor, type AuditRequestContext } from "@/lib/audit/service";
import dbConnect from "@/lib/dbConnect";
import {
    adminFacultyProvisionSchema,
    adminStudentProvisionSchema,
    adminUserUpdateSchema,
} from "@/lib/admin/validators";
import { AuthError } from "@/lib/auth/errors";
import Program from "@/models/academic/program";
import User from "@/models/core/user";
import Department from "@/models/reference/department";
import Institution from "@/models/reference/institution";
import Faculty from "@/models/faculty/faculty";
import Student from "@/models/student/student";

type ProvisionedUser = Awaited<ReturnType<typeof createProvisionedStudent>>;

export async function getAdminUsers() {
    await dbConnect();

    const users = await User.find()
        .sort({ createdAt: -1 })
        .select(
            "name email role accountStatus universityName collegeName department designation phone emailVerified isActive lastLoginAt createdAt studentId facultyId"
        );

    const facultyIds = users
        .map((user) => user.facultyId?.toString())
        .filter((value): value is string => Boolean(value));

    const faculties = facultyIds.length
        ? await Faculty.find({ _id: { $in: facultyIds } }).select(
              "employeeCode designation departmentId institutionId"
          )
        : [];

    const studentIds = users
        .map((user) => user.studentId?.toString())
        .filter((value): value is string => Boolean(value));

    const students = studentIds.length
        ? await Student.find({ _id: { $in: studentIds } }).select("enrollmentNo")
        : [];

    const facultyMap = new Map(
        faculties.map((faculty) => [faculty._id.toString(), faculty])
    );

    const studentMap = new Map(
        students.map((student) => [student._id.toString(), student])
    );

    return users.map((user) => {
        const faculty = user.facultyId
            ? facultyMap.get(user.facultyId.toString())
            : null;
        const student = user.studentId
            ? studentMap.get(user.studentId.toString())
            : null;

        return {
            ...JSON.parse(JSON.stringify(user)),
            studentSummary: student
                ? {
                      enrollmentNo: student.enrollmentNo,
                  }
                : undefined,
            facultySummary: faculty
                ? {
                      employeeCode: faculty.employeeCode,
                      designation: faculty.designation,
                  }
                : undefined,
        };
    });
}

export type StudentProvisionBulkFailure = {
    rowNumber: number;
    enrollmentNo?: string;
    email?: string;
    message: string;
};

export type StudentProvisionBulkResult = {
    created: ProvisionedUser[];
    failed: StudentProvisionBulkFailure[];
};

export type FacultyProvisionBulkFailure = {
    rowNumber: number;
    employeeCode?: string;
    email?: string;
    message: string;
};

export type FacultyProvisionBulkResult = {
    created: Awaited<ReturnType<typeof createProvisionedFaculty>>[];
    failed: FacultyProvisionBulkFailure[];
};

function getBulkRowNumber(rawEntry: unknown, index: number) {
    if (typeof rawEntry === "object" && rawEntry !== null) {
        const rowNumber = (rawEntry as { rowNumber?: unknown }).rowNumber;

        if (typeof rowNumber === "number" && Number.isFinite(rowNumber)) {
            return Math.max(2, Math.floor(rowNumber));
        }
    }

    return index + 2;
}

function stripBulkMetaFields(rawEntry: unknown) {
    if (typeof rawEntry !== "object" || rawEntry === null) {
        return rawEntry;
    }

    const next = { ...(rawEntry as Record<string, unknown>) };
    delete next.rowNumber;
    return next;
}

async function ensureInstitutionDepartment(
    universityName: string,
    departmentName: string,
    session: mongoose.mongo.ClientSession
) {
    let institution = await Institution.findOne({ name: universityName }).session(session);

    if (!institution) {
        institution = await Institution.create([{ name: universityName }], { session }).then(
            (docs) => docs[0]
        );
    }

    if (!institution) {
        throw new AuthError("Institution provisioning failed.", 500);
    }

    let department = await Department.findOne({
        institutionId: institution._id,
        name: departmentName,
    }).session(session);

    if (!department) {
        department = await Department.create(
            [{ institutionId: institution._id, name: departmentName }],
            { session }
        ).then((docs) => docs[0]);
    }

    if (!department) {
        throw new AuthError("Department provisioning failed.", 500);
    }

    return { institution, department };
}

export async function createProvisionedStudent(
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    const input = adminStudentProvisionSchema.parse(rawInput);

    await dbConnect();

    const existingUser = await User.findOne({ email: input.email.toLowerCase() }).select("_id");

    if (existingUser) {
        throw new AuthError("A UMIS user account already exists for that email.", 409);
    }

    const existingStudent = await Student.findOne({
        enrollmentNo: input.enrollmentNo,
    }).select("_id");

    if (existingStudent) {
        throw new AuthError("That enrollment number is already provisioned.", 409);
    }

    const session = await mongoose.startSession();

    try {
        let createdUser: InstanceType<typeof User> | null = null;

        await session.withTransaction(async () => {
            const { institution, department } = await ensureInstitutionDepartment(
                input.universityName,
                input.department,
                session
            );

            let program = await Program.findOne({
                departmentId: department._id,
                name: input.course,
            }).session(session);

            if (!program) {
                program = await Program.create(
                    [
                        {
                            name: input.course,
                            institutionId: institution._id,
                            departmentId: department._id,
                            degreeType: input.course,
                            durationYears: input.durationYears,
                            collegeName: input.collegeName,
                            type: "Regular",
                            yearOfIntroduction: String(input.admissionYear),
                            isCBCS: true,
                            isActive: true,
                        },
                    ],
                    { session }
                ).then((docs) => docs[0]);
            }

            if (!program) {
                throw new AuthError("Program provisioning failed.", 500);
            }

            const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ");
            const student = await Student.create(
                [
                    {
                        enrollmentNo: input.enrollmentNo,
                        firstName: input.firstName,
                        lastName: input.lastName || undefined,
                        email: input.email.toLowerCase(),
                        mobile: input.mobile,
                        institutionId: institution._id,
                        departmentId: department._id,
                        programId: program._id,
                        admissionYear: input.admissionYear,
                        status: "Active",
                    },
                ],
                { session }
            ).then((docs) => docs[0]);

            const provisionedUser = await User.create(
                [
                    {
                        name: fullName,
                        email: input.email.toLowerCase(),
                        role: "Student",
                        accountStatus: "PendingActivation",
                        phone: input.mobile,
                        institutionId: institution._id,
                        departmentId: department._id,
                        studentId: student._id,
                        universityName: input.universityName,
                        collegeName: input.collegeName,
                        department: input.department,
                        experience: [],
                        emailVerified: true,
                        isActive: true,
                    },
                ],
                { session }
            ).then((docs) => docs[0]);

            if (!provisionedUser) {
                throw new AuthError("User provisioning failed.", 500);
            }

            createdUser = provisionedUser;
            student.userId = provisionedUser._id;
            await student.save({ session });
        });

        if (!createdUser) {
            throw new AuthError("Student provisioning could not be completed.", 500);
        }
        const provisionedStudentUser = createdUser;

        if (options?.actor) {
            await createAuditLog({
                actor: options.actor,
                action: "USER_PROVISION_STUDENT",
                tableName: "users",
                recordId: String((provisionedStudentUser as { _id: unknown })._id),
                newData: provisionedStudentUser,
                auditContext: options.auditContext,
            });
        }

        return provisionedStudentUser;
    } finally {
        await session.endSession();
    }
}

export async function createProvisionedFaculty(
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    const input = adminFacultyProvisionSchema.parse(rawInput);

    await dbConnect();

    const existingUser = await User.findOne({ email: input.email.toLowerCase() }).select("_id");

    if (existingUser) {
        throw new AuthError("A UMIS user account already exists for that email.", 409);
    }

    const existingFaculty = await Faculty.findOne({
        $or: [{ employeeCode: input.employeeCode }, { email: input.email.toLowerCase() }],
    }).select("_id");

    if (existingFaculty) {
        throw new AuthError("That faculty employee code or email is already provisioned.", 409);
    }

    const session = await mongoose.startSession();

    try {
        let createdUser: InstanceType<typeof User> | null = null;

        await session.withTransaction(async () => {
            const { institution, department } = await ensureInstitutionDepartment(
                input.universityName,
                input.department,
                session
            );

            const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ");

            const faculty = await Faculty.create(
                [
                    {
                        employeeCode: input.employeeCode,
                        firstName: input.firstName,
                        lastName: input.lastName || undefined,
                        email: input.email.toLowerCase(),
                        mobile: input.mobile,
                        designation: input.designation,
                        joiningDate: input.joiningDate ? new Date(input.joiningDate) : undefined,
                        employmentType: input.employmentType,
                        departmentId: department._id,
                        institutionId: institution._id,
                        highestQualification: input.highestQualification || undefined,
                        specialization: input.specialization || undefined,
                        experienceYears: input.experienceYears,
                        status: "Active",
                        researchInterests: [],
                        professionalMemberships: [],
                        certifications: [],
                        administrativeResponsibilities: [],
                    },
                ],
                { session }
            ).then((docs) => docs[0]);

            const provisionedUser = await User.create(
                [
                    {
                        name: fullName,
                        email: input.email.toLowerCase(),
                        role: "Faculty",
                        accountStatus: "PendingActivation",
                        phone: input.mobile,
                        institutionId: institution._id,
                        departmentId: department._id,
                        facultyId: faculty._id,
                        universityName: input.universityName,
                        collegeName: input.collegeName,
                        department: input.department,
                        designation: input.designation,
                        experience: [],
                        emailVerified: true,
                        isActive: true,
                    },
                ],
                { session }
            ).then((docs) => docs[0]);

            if (!provisionedUser) {
                throw new AuthError("User provisioning failed.", 500);
            }

            createdUser = provisionedUser;
            faculty.userId = provisionedUser._id;
            await faculty.save({ session });
        });

        if (!createdUser) {
            throw new AuthError("Faculty provisioning could not be completed.", 500);
        }
        const provisionedFacultyUser = createdUser;

        if (options?.actor) {
            await createAuditLog({
                actor: options.actor,
                action: "USER_PROVISION_FACULTY",
                tableName: "users",
                recordId: String((provisionedFacultyUser as { _id: unknown })._id),
                newData: provisionedFacultyUser,
                auditContext: options.auditContext,
            });
        }

        return provisionedFacultyUser;
    } finally {
        await session.endSession();
    }
}

export async function createProvisionedStudentsBulk(
    rawEntries: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
): Promise<StudentProvisionBulkResult> {
    if (!Array.isArray(rawEntries)) {
        throw new Error("Bulk payload must provide an entries array.");
    }

    if (!rawEntries.length) {
        throw new Error("Add at least one student row before uploading.");
    }

    if (rawEntries.length > 500) {
        throw new Error("Bulk student import is limited to 500 rows per upload.");
    }

    const created: ProvisionedUser[] = [];
    const failed: StudentProvisionBulkFailure[] = [];

    for (const [index, rawEntry] of rawEntries.entries()) {
        const rowNumber = getBulkRowNumber(rawEntry, index);

        try {
            const user = await createProvisionedStudent(stripBulkMetaFields(rawEntry));
            created.push(user);
        } catch (error) {
            failed.push({
                rowNumber,
                enrollmentNo:
                    typeof rawEntry === "object" && rawEntry !== null
                        ? String((rawEntry as { enrollmentNo?: unknown }).enrollmentNo ?? "")
                        : undefined,
                email:
                    typeof rawEntry === "object" && rawEntry !== null
                        ? String((rawEntry as { email?: unknown }).email ?? "")
                        : undefined,
                message: error instanceof Error ? error.message : "Unable to provision this row.",
            });
        }
    }

    if (options?.actor) {
        const createdIds = created.map((user) => String((user as { _id: unknown })._id));
        await createAuditLog({
            actor: options.actor,
            action: "USER_PROVISION_STUDENT_BULK",
            tableName: "users",
            newData: {
                createdCount: created.length,
                failedCount: failed.length,
                createdIds,
                failed,
            },
            auditContext: options.auditContext,
        });
    }

    return { created, failed };
}

export async function createProvisionedFacultyBulk(
    rawEntries: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
): Promise<FacultyProvisionBulkResult> {
    if (!Array.isArray(rawEntries)) {
        throw new Error("Bulk payload must provide an entries array.");
    }

    if (!rawEntries.length) {
        throw new Error("Add at least one faculty row before uploading.");
    }

    if (rawEntries.length > 500) {
        throw new Error("Bulk faculty import is limited to 500 rows per upload.");
    }

    const created: Awaited<ReturnType<typeof createProvisionedFaculty>>[] = [];
    const failed: FacultyProvisionBulkFailure[] = [];

    for (const [index, rawEntry] of rawEntries.entries()) {
        const rowNumber = getBulkRowNumber(rawEntry, index);

        try {
            const user = await createProvisionedFaculty(stripBulkMetaFields(rawEntry));
            created.push(user);
        } catch (error) {
            failed.push({
                rowNumber,
                employeeCode:
                    typeof rawEntry === "object" && rawEntry !== null
                        ? String((rawEntry as { employeeCode?: unknown }).employeeCode ?? "")
                        : undefined,
                email:
                    typeof rawEntry === "object" && rawEntry !== null
                        ? String((rawEntry as { email?: unknown }).email ?? "")
                        : undefined,
                message: error instanceof Error ? error.message : "Unable to provision this row.",
            });
        }
    }

    if (options?.actor) {
        const createdIds = created.map((user) => String((user as { _id: unknown })._id));
        await createAuditLog({
            actor: options.actor,
            action: "USER_PROVISION_FACULTY_BULK",
            tableName: "users",
            newData: {
                createdCount: created.length,
                failedCount: failed.length,
                createdIds,
                failed,
            },
            auditContext: options.auditContext,
        });
    }

    return { created, failed };
}

export async function updateAdminUser(
    userId: string,
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    const input = adminUserUpdateSchema.parse(rawInput);

    await dbConnect();

    const user = await User.findById(userId);

    if (!user) {
        throw new AuthError("User not found.", 404);
    }

    const oldState = user.toObject();

    if (input.role !== undefined) {
        user.role = input.role;
    }

    if (input.isActive !== undefined) {
        user.isActive = input.isActive;
    }

    if (input.emailVerified !== undefined) {
        user.emailVerified = input.emailVerified;
    }

    if (input.universityName !== undefined) {
        user.universityName = input.universityName || undefined;
    }

    if (input.collegeName !== undefined) {
        user.collegeName = input.collegeName || undefined;
    }

    if (input.department !== undefined) {
        user.department = input.department || undefined;
    }

    await user.save();

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "USER_ADMIN_UPDATE",
            tableName: "users",
            recordId: user._id.toString(),
            oldData: oldState,
            newData: user.toObject(),
            auditContext: options.auditContext,
        });
    }

    return user;
}
