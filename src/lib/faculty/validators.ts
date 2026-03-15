import { z } from "zod";

const qualificationSchema = z.object({
    level: z.string().trim().min(2, "Qualification level is required."),
    degree: z.string().trim().min(2, "Degree title is required."),
    subject: z.string().trim().optional(),
    institution: z.string().trim().optional(),
    year: z.string().trim().optional(),
});

const researchProfileSchema = z.object({
    orcidId: z.string().trim().optional(),
    scopusId: z.string().trim().optional(),
    researcherId: z.string().trim().optional(),
    googleScholarId: z.string().trim().optional(),
});

const teachingLoadSchema = z.object({
    _id: z.string().optional(),
    academicYear: z.string().trim().min(4, "Academic year is required."),
    programName: z.string().trim().min(2, "Program is required."),
    courseName: z.string().trim().min(2, "Course name is required."),
    semester: z.coerce.number().int().min(1).max(12),
    subjectCode: z.string().trim().optional(),
    lectureHours: z.coerce.number().min(0).default(0),
    tutorialHours: z.coerce.number().min(0).default(0),
    practicalHours: z.coerce.number().min(0).default(0),
    innovativePedagogy: z.string().trim().optional(),
});

const resultSummarySchema = z.object({
    _id: z.string().optional(),
    academicYear: z.string().trim().min(4, "Academic year is required."),
    subjectName: z.string().trim().min(2, "Subject name is required."),
    appearedStudents: z.coerce.number().int().min(0).default(0),
    passedStudents: z.coerce.number().int().min(0).default(0),
    universityRankStudents: z.coerce.number().int().min(0).default(0),
});

const administrativeRoleSchema = z.object({
    _id: z.string().optional(),
    academicYear: z.string().trim().optional(),
    roleName: z.string().trim().min(2, "Role name is required."),
    committeeName: z.string().trim().optional(),
    responsibilityDescription: z.string().trim().optional(),
});

const fdpSchema = z.object({
    _id: z.string().optional(),
    title: z.string().trim().min(2, "Programme title is required."),
    sponsoredBy: z.string().trim().optional(),
    level: z.enum(["College", "State", "National", "International"]).default("College"),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    participantsCount: z.coerce.number().int().min(0).default(0),
});

const socialExtensionSchema = z.object({
    _id: z.string().optional(),
    academicYear: z.string().trim().optional(),
    programName: z.string().trim().min(2, "Programme name is required."),
    activityName: z.string().trim().min(2, "Activity name is required."),
    hoursContributed: z.coerce.number().min(0).default(0),
});

export const facultyRecordSchema = z.object({
    employeeCode: z.string().trim().optional(),
    joiningDate: z.string().trim().optional(),
    biography: z.string().trim().optional(),
    specialization: z.string().trim().optional(),
    highestQualification: z.string().trim().optional(),
    employmentType: z.enum(["Permanent", "AdHoc", "Guest"]).default("Permanent"),
    experienceYears: z.coerce.number().min(0).default(0),
    researchInterests: z.array(z.string().trim().min(1)).default([]),
    professionalMemberships: z.array(z.string().trim().min(1)).default([]),
    certifications: z.array(z.string().trim().min(1)).default([]),
    administrativeResponsibilities: z.array(z.string().trim().min(1)).default([]),
    qualifications: z.array(qualificationSchema).default([]),
    researchProfile: researchProfileSchema.default({}),
    teachingLoads: z.array(teachingLoadSchema).default([]),
    resultSummaries: z.array(resultSummarySchema).default([]),
    administrativeRoles: z.array(administrativeRoleSchema).default([]),
    facultyDevelopmentProgrammes: z.array(fdpSchema).default([]),
    socialExtensionActivities: z.array(socialExtensionSchema).default([]),
});

export type FacultyRecordInput = z.input<typeof facultyRecordSchema>;
