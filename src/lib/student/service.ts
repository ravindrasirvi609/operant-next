import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import User from "@/models/core/user";
import Organization from "@/models/core/organization";
import {
    studentApprovalDecisionSchema,
    studentProfileSchema,
} from "@/lib/student/validators";

function ensureStringArray(value: unknown) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }

    return String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function normalizeProfile(rawInput: unknown) {
    const input = rawInput as Record<string, unknown>;

    return studentProfileSchema.parse({
        ...input,
        areasOfInterest: ensureStringArray(input.areasOfInterest),
        skills: ensureStringArray(input.skills),
        languages: ensureStringArray(input.languages),
        certifications: ensureStringArray(input.certifications),
        achievements: ensureStringArray(input.achievements),
        projects: Array.isArray(input.projects) ? input.projects : [],
        internships: Array.isArray(input.internships) ? input.internships : [],
    });
}

export async function getStudentProfile(userId: string) {
    await dbConnect();

    const user = await User.findById(userId);

    if (!user || user.role !== "Student" || !user.studentDetails) {
        throw new AuthError("Student profile not found.", 404);
    }

    return user;
}

export async function submitStudentProfile(userId: string, rawInput: unknown) {
    const input = normalizeProfile(rawInput);

    await dbConnect();

    const user = await User.findById(userId);

    if (!user || user.role !== "Student" || !user.studentDetails) {
        throw new AuthError("Student profile not found.", 404);
    }

    const department = await Organization.findOne({
        type: "Department",
        name: user.department,
        isActive: true,
    });

    if (!department?.headUserId) {
        throw new AuthError(
            "No HOD is assigned to this department. Ask the administrator to map the department head first.",
            400
        );
    }

    const hodUser = await User.findById(department.headUserId).select("name email");

    if (!hodUser) {
        throw new AuthError("Assigned HOD account was not found.", 404);
    }

    const wasAlreadyApproved = user.studentDetails.profileStatus === "Approved";

    user.studentDetails.personalInfo = {
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
    };
    user.studentDetails.academicInfo = {
        currentSemester: input.currentSemester,
        cgpa: input.cgpa,
        section: input.section,
        mentorName: input.mentorName,
        areasOfInterest: input.areasOfInterest,
    };
    user.studentDetails.careerProfile = {
        headline: input.headline,
        summary: input.summary,
        careerObjective: input.careerObjective,
        skills: input.skills,
        languages: input.languages,
        certifications: input.certifications,
        achievements: input.achievements,
        projects: input.projects,
        internships: input.internships,
        socialLinks: {
            linkedin: input.linkedin,
            github: input.github,
            portfolio: input.portfolio,
        },
    };
    user.studentDetails.assignedHodId = hodUser._id as Types.ObjectId;
    user.studentDetails.assignedHodName = hodUser.name;
    user.studentDetails.assignedHodEmail = hodUser.email;

    if (wasAlreadyApproved) {
        user.studentDetails.profileStatus = "Approved";
        user.studentDetails.rejectionReason = undefined;
        user.isActive = true;
    } else {
        user.studentDetails.profileStatus = "PendingApproval";
        user.studentDetails.profileSubmittedAt = new Date();
        user.studentDetails.rejectionReason = undefined;
        user.studentDetails.approvalNotes = undefined;
        user.isActive = false;
    }

    await user.save();

    return {
        user,
        message: wasAlreadyApproved
            ? "Profile updated successfully. No additional HOD approval is required."
            : "Profile submitted successfully and routed to the respective HOD.",
        redirectPath: wasAlreadyApproved ? "/student/profile" : "/student/verification-pending",
    };
}

export async function getHodApprovalQueue(hodUserId: string) {
    await dbConnect();

    const departments = await Organization.find({
        type: "Department",
        headUserId: hodUserId,
        isActive: true,
    }).select("name");

    const departmentNames = departments.map((item) => item.name);

    if (!departmentNames.length) {
        return [];
    }

    return User.find({
        role: "Student",
        department: { $in: departmentNames },
        "studentDetails.profileStatus": { $in: ["PendingApproval", "Rejected"] },
        "studentDetails.assignedHodId": hodUserId,
    }).sort({ "studentDetails.profileSubmittedAt": -1 });
}

export async function decideStudentApproval(
    hodUserId: string,
    studentId: string,
    rawInput: unknown
) {
    const input = studentApprovalDecisionSchema.parse(rawInput);

    await dbConnect();

    const user = await User.findById(studentId);

    if (!user || user.role !== "Student" || !user.studentDetails) {
        throw new AuthError("Student profile not found.", 404);
    }

    if (user.studentDetails.assignedHodId?.toString() !== hodUserId) {
        throw new AuthError("This approval request is not assigned to you.", 403);
    }

    const hodUser = await User.findById(hodUserId).select("name");

    if (!hodUser) {
        throw new AuthError("HOD account not found.", 404);
    }

    if (input.decision === "approve") {
        user.studentDetails.profileStatus = "Approved";
        user.studentDetails.approvedAt = new Date();
        user.studentDetails.approvedById = hodUser._id as Types.ObjectId;
        user.studentDetails.approvedByName = hodUser.name;
        user.studentDetails.approvalNotes = input.notes || undefined;
        user.studentDetails.rejectionReason = undefined;
        user.isActive = true;
    } else {
        user.studentDetails.profileStatus = "Rejected";
        user.studentDetails.rejectionReason =
            input.notes || "Please revise and resubmit the student profile.";
        user.studentDetails.approvalNotes = input.notes || undefined;
        user.isActive = false;
    }

    await user.save();

    return user;
}

export function buildStudentResumeHtml(
    user: Awaited<ReturnType<typeof getStudentProfile>>
) {
    const personal = user.studentDetails?.personalInfo;
    const academic = user.studentDetails?.academicInfo;
    const career = user.studentDetails?.careerProfile;

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${user.name} Resume</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; color: #18181b; }
      h1, h2 { margin-bottom: 8px; }
      h2 { margin-top: 28px; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px; }
      p, li { line-height: 1.6; }
      ul { padding-left: 20px; }
    </style>
  </head>
  <body>
    <h1>${user.name}</h1>
    <p>${career?.headline ?? ""}</p>
    <p>${user.email} | ${user.phone ?? ""}</p>
    <h2>Career Objective</h2>
    <p>${career?.careerObjective ?? ""}</p>
    <h2>Summary</h2>
    <p>${career?.summary ?? ""}</p>
    <h2>Academic Profile</h2>
    <p>${user.studentDetails?.course ?? ""} | Batch ${user.studentDetails?.batch ?? ""} | Semester ${academic?.currentSemester ?? ""} | CGPA ${academic?.cgpa ?? ""}</p>
    <p>University: ${user.universityName ?? ""} | College: ${user.collegeName ?? ""} | Department: ${user.department ?? ""}</p>
    <h2>Skills</h2>
    <ul>${(career?.skills ?? []).map((item) => `<li>${item}</li>`).join("")}</ul>
    <h2>Projects</h2>
    ${(career?.projects ?? [])
        .map((item) => `<p><strong>${item.title}</strong><br/>${item.description ?? ""}</p>`)
        .join("")}
    <h2>Internships</h2>
    ${(career?.internships ?? [])
        .map((item) => `<p><strong>${item.organization}</strong> - ${item.role ?? ""}<br/>${item.description ?? ""}</p>`)
        .join("")}
    <h2>Achievements</h2>
    <ul>${(career?.achievements ?? []).map((item) => `<li>${item}</li>`).join("")}</ul>
    <h2>Contact</h2>
    <p>${personal?.address ?? ""}, ${personal?.city ?? ""}, ${personal?.state ?? ""} ${personal?.postalCode ?? ""}</p>
    <p>LinkedIn: ${career?.socialLinks?.linkedin ?? ""}</p>
    <p>GitHub: ${career?.socialLinks?.github ?? ""}</p>
    <p>Portfolio: ${career?.socialLinks?.portfolio ?? ""}</p>
  </body>
</html>`;
}
