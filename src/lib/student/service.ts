import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import { studentProfileSchema } from "@/lib/student/validators";
import User from "@/models/core/user";
import Student from "@/models/student/student";
import Program from "@/models/academic/program";
import "@/models/reference/institution";
import "@/models/reference/department";

function toDateOrUndefined(value?: string) {
    if (!value) {
        return undefined;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function migrateLegacyStudentDetails(user: InstanceType<typeof User>, student: InstanceType<typeof Student>) {
    const legacyDetails = (user as typeof user & {
        studentDetails?: {
            personalInfo?: {
                dateOfBirth?: string;
                gender?: string;
                address?: string;
                city?: string;
                state?: string;
                postalCode?: string;
            };
        };
    }).studentDetails;

    if (!legacyDetails) {
        return;
    }

    const updates: Partial<{
        dob: Date;
        gender: "Male" | "Female" | "Other";
        address: string;
    }> = {};

    if (!student.dob && legacyDetails.personalInfo?.dateOfBirth) {
        const dob = toDateOrUndefined(legacyDetails.personalInfo.dateOfBirth);
        if (dob) {
            updates.dob = dob;
        }
    }

    if (!student.gender && legacyDetails.personalInfo?.gender) {
        const gender = legacyDetails.personalInfo.gender.trim();
        if (gender === "Male" || gender === "Female" || gender === "Other") {
            updates.gender = gender;
        }
    }

    if (!student.address) {
        const addressParts = [
            legacyDetails.personalInfo?.address,
            legacyDetails.personalInfo?.city,
            legacyDetails.personalInfo?.state,
            legacyDetails.personalInfo?.postalCode,
        ]
            .map((part) => part?.trim())
            .filter(Boolean);

        if (addressParts.length) {
            updates.address = addressParts.join(", ");
        }
    }

    if (Object.keys(updates).length) {
        Object.assign(student, updates);
        await student.save();
    }

    await User.updateOne({ _id: user._id }, { $unset: { studentDetails: 1 } });
    user.set("studentDetails", undefined, { strict: false });
}

export async function getStudentProfile(userId: string) {
    await dbConnect();

    const user = await User.findById(userId);

    if (!user || user.role !== "Student") {
        throw new AuthError("Student account not found.", 404);
    }

    const student =
        (user.studentId
            ? await Student.findById(user.studentId)
                  .populate("institutionId")
                  .populate("departmentId")
                  .populate("programId")
            : null) ||
        (await Student.findOne({ userId: user._id })
            .populate("institutionId")
            .populate("departmentId")
            .populate("programId"));

    if (!student) {
        throw new AuthError("Student record not found.", 404);
    }

    await migrateLegacyStudentDetails(user, student);

    const program = student.programId
        ? await Program.findById(student.programId).select("name durationYears degreeType")
        : null;

    return {
        user,
        student,
        institution: student.institutionId,
        department: student.departmentId,
        program: program ?? student.programId,
    };
}

export async function saveStudentProfile(userId: string, rawInput: unknown) {
    const input = studentProfileSchema.parse(rawInput);

    await dbConnect();

    const user = await User.findById(userId);

    if (!user || user.role !== "Student") {
        throw new AuthError("Student account not found.", 404);
    }

    const student =
        (user.studentId
            ? await Student.findById(user.studentId)
            : await Student.findOne({ userId: user._id })) ?? null;

    if (!student) {
        throw new AuthError("Student record not found.", 404);
    }

    const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();

    student.firstName = input.firstName;
    student.lastName = input.lastName || undefined;
    student.gender = input.gender;
    student.dob = toDateOrUndefined(input.dob) ?? undefined;
    student.mobile = input.mobile || undefined;
    student.address = input.address || undefined;

    user.name = fullName || input.firstName;
    user.phone = input.mobile || undefined;

    await Promise.all([student.save(), user.save()]);

    return {
        message: "Student profile updated successfully.",
        profile: {
            firstName: student.firstName,
            lastName: student.lastName ?? "",
            gender: student.gender,
            dob: student.dob ? student.dob.toISOString().slice(0, 10) : "",
            mobile: student.mobile ?? "",
            address: student.address ?? "",
        },
    };
}
