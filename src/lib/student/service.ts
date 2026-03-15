import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import User from "@/models/core/user";
import Student from "@/models/student/student";
import Program from "@/models/academic/program";
import "@/models/reference/institution";
import "@/models/reference/department";
import { studentProfileSchema } from "@/lib/student/validators";

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

    return {
        user,
        student,
        institution: student.institutionId,
        department: student.departmentId,
        program: student.programId,
    };
}

function buildBatch(admissionYear: number, durationYears?: number) {
    if (!durationYears) {
        return `${admissionYear}`;
    }
    return `${admissionYear}-${admissionYear + durationYears}`;
}

function toPlainObject<T>(value: T): T {
    if (!value) {
        return value;
    }

    if (typeof value === "object" && value !== null && "toObject" in (value as object)) {
        return (value as unknown as { toObject: () => T }).toObject();
    }

    return value;
}

export async function updateStudentProfile(userId: string, rawInput: unknown) {
    await dbConnect();

    const user = await User.findById(userId);

    if (!user || user.role !== "Student") {
        throw new AuthError("Student account not found.", 404);
    }

    const input = studentProfileSchema.parse(rawInput);

    const student =
        (user.studentId
            ? await Student.findById(user.studentId)
            : await Student.findOne({ userId: user._id })) ?? null;

    if (!student) {
        throw new AuthError("Student record not found.", 404);
    }

    const program = student.programId
        ? await Program.findById(student.programId).select("name durationYears")
        : null;

    const existingDetails =
        toPlainObject(user.studentDetails) ?? {
        rollNo: student.enrollmentNo,
        course: program?.name ?? "Program",
        batch: buildBatch(student.admissionYear, program?.durationYears),
        admissionYear: String(student.admissionYear),
    };

    const normalizedAcademicInfo =
        toPlainObject(existingDetails.academicInfo) ?? {
            currentSemester: "",
            cgpa: "",
            section: "",
            mentorName: "",
            areasOfInterest: [],
        };

    const normalizedCareerProfile =
        toPlainObject(existingDetails.careerProfile) ?? {
            headline: "",
            summary: "",
            careerObjective: "",
            skills: [],
            languages: [],
            certifications: [],
            achievements: [],
            projects: [],
            internships: [],
            socialLinks: {
                linkedin: "",
                github: "",
                portfolio: "",
            },
        };

    const shouldAutoApprove =
        !existingDetails.profileStatus ||
        existingDetails.profileStatus === "Draft" ||
        existingDetails.profileStatus === "Rejected";

    const nextStatus = shouldAutoApprove ? "Approved" : existingDetails.profileStatus;

    user.studentDetails = {
        ...existingDetails,
        profileStatus: nextStatus,
        profileSubmittedAt: shouldAutoApprove ? new Date() : existingDetails.profileSubmittedAt,
        approvedAt: shouldAutoApprove ? new Date() : existingDetails.approvedAt,
        approvedById: shouldAutoApprove ? user._id : existingDetails.approvedById,
        approvedByName: shouldAutoApprove ? user.name : existingDetails.approvedByName,
        rejectionReason: shouldAutoApprove ? undefined : existingDetails.rejectionReason,
        personalInfo: {
            dateOfBirth: input.dateOfBirth,
            gender: input.gender,
            bloodGroup: input.bloodGroup,
            address: input.address,
            city: input.city,
            state: input.state,
            postalCode: input.postalCode,
            emergencyContactName: input.emergencyContactName,
            emergencyContactPhone: input.emergencyContactPhone,
            parentName: input.parentName,
            parentPhone: input.parentPhone,
        },
        academicInfo: {
            currentSemester: normalizedAcademicInfo.currentSemester ?? "",
            cgpa: normalizedAcademicInfo.cgpa ?? "",
            section: normalizedAcademicInfo.section ?? "",
            mentorName: normalizedAcademicInfo.mentorName ?? "",
            areasOfInterest: normalizedAcademicInfo.areasOfInterest ?? [],
        },
        careerProfile: {
            headline: normalizedCareerProfile.headline ?? "",
            summary: normalizedCareerProfile.summary ?? "",
            careerObjective: normalizedCareerProfile.careerObjective ?? "",
            skills: normalizedCareerProfile.skills ?? [],
            languages: normalizedCareerProfile.languages ?? [],
            certifications: normalizedCareerProfile.certifications ?? [],
            achievements: normalizedCareerProfile.achievements ?? [],
            projects: normalizedCareerProfile.projects ?? [],
            internships: normalizedCareerProfile.internships ?? [],
            socialLinks: {
                linkedin: normalizedCareerProfile.socialLinks?.linkedin ?? "",
                github: normalizedCareerProfile.socialLinks?.github ?? "",
                portfolio: normalizedCareerProfile.socialLinks?.portfolio ?? "",
            },
        },
    };

    await user.save();

    return {
        user,
        student,
        institution: student.institutionId,
        department: student.departmentId,
        program: student.programId,
    };
}
