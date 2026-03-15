import mongoose from "mongoose";

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
            "name email role accountStatus universityName collegeName department designation phone emailVerified isActive lastLoginAt createdAt studentDetails.rollNo facultyId"
        );

    const facultyIds = users
        .map((user) => user.facultyId?.toString())
        .filter((value): value is string => Boolean(value));

    const faculties = facultyIds.length
        ? await Faculty.find({ _id: { $in: facultyIds } }).select(
              "employeeCode designation departmentId institutionId"
          )
        : [];

    const facultyMap = new Map(
        faculties.map((faculty) => [faculty._id.toString(), faculty])
    );

    return users.map((user) => {
        const faculty = user.facultyId
            ? facultyMap.get(user.facultyId.toString())
            : null;

        return {
            ...JSON.parse(JSON.stringify(user)),
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

export async function createProvisionedStudent(rawInput: unknown) {
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
            const batch = `${input.admissionYear}-${input.admissionYear + input.durationYears}`;

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
                        qualifications: [],
                        experience: [],
                        emailVerified: true,
                        isActive: true,
                        studentDetails: {
                            rollNo: input.enrollmentNo,
                            course: input.course,
                            batch,
                            admissionYear: String(input.admissionYear),
                            profileStatus: "Approved",
                        },
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

        return createdUser;
    } finally {
        await session.endSession();
    }
}

export async function createProvisionedFaculty(rawInput: unknown) {
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
                        qualifications: [],
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
                        qualifications: [],
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

        return createdUser;
    } finally {
        await session.endSession();
    }
}

export async function createProvisionedStudentsBulk(
    rawEntries: unknown
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

    return { created, failed };
}

export async function createProvisionedFacultyBulk(
    rawEntries: unknown
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

    return { created, failed };
}

export async function updateAdminUser(userId: string, rawInput: unknown) {
    const input = adminUserUpdateSchema.parse(rawInput);

    await dbConnect();

    const user = await User.findById(userId);

    if (!user) {
        throw new AuthError("User not found.", 404);
    }

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

    return user;
}
