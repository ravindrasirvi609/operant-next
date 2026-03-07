import { z } from "zod";

const degreeSchema = z.object({
    level: z.string().trim().min(2, "Degree level is required."),
    degree: z.string().trim().min(2, "Degree title is required."),
    subject: z.string().trim().optional(),
    institution: z.string().trim().optional(),
    year: z.string().trim().optional(),
});

const casEntrySchema = z.object({
    _id: z.string().optional(),
    assessmentPeriodStart: z.string().trim().min(4, "CAS period start is required."),
    assessmentPeriodEnd: z.string().trim().min(4, "CAS period end is required."),
    promotionFrom: z.string().trim().min(2, "Promotion from is required."),
    promotionTo: z.string().trim().min(2, "Promotion to is required."),
    currentStage: z.string().trim().optional(),
    teachingExperienceYears: z.coerce.number().min(0).default(0),
    researchSummary: z.string().trim().optional(),
    publicationCount: z.coerce.number().min(0).default(0),
    bookCount: z.coerce.number().min(0).default(0),
    conferenceCount: z.coerce.number().min(0).default(0),
    workshopCount: z.coerce.number().min(0).default(0),
    projectCount: z.coerce.number().min(0).default(0),
    phdSupervisionCount: z.coerce.number().min(0).default(0),
    adminResponsibilitySummary: z.string().trim().optional(),
    apiScoreClaimed: z.coerce.number().min(0).default(0),
    status: z.enum(["Draft", "Submitted"]).default("Submitted"),
});

const pbasEntrySchema = z.object({
    _id: z.string().optional(),
    academicYear: z.string().trim().min(4, "Academic year is required."),
    teachingHours: z.coerce.number().min(0).default(0),
    coursesHandled: z.array(z.string().trim().min(1)).default([]),
    mentoringCount: z.coerce.number().min(0).default(0),
    labSupervisionCount: z.coerce.number().min(0).default(0),
    researchPaperCount: z.coerce.number().min(0).default(0),
    journalCount: z.coerce.number().min(0).default(0),
    bookCount: z.coerce.number().min(0).default(0),
    patentCount: z.coerce.number().min(0).default(0),
    conferenceCount: z.coerce.number().min(0).default(0),
    committeeWork: z.string().trim().optional(),
    examDuties: z.string().trim().optional(),
    studentGuidance: z.string().trim().optional(),
    teachingScore: z.coerce.number().min(0).default(0),
    researchScore: z.coerce.number().min(0).default(0),
    institutionalScore: z.coerce.number().min(0).default(0),
    remarks: z.string().trim().optional(),
});

const aqarEntrySchema = z.object({
    _id: z.string().optional(),
    academicYear: z.string().trim().min(4, "Academic year is required."),
    teachingInnovations: z.string().trim().optional(),
    facultyDevelopmentActivities: z.string().trim().optional(),
    publications: z.string().trim().optional(),
    conferences: z.string().trim().optional(),
    workshopsConducted: z.string().trim().optional(),
    extensionActivities: z.string().trim().optional(),
    studentResults: z.string().trim().optional(),
    infrastructureSupport: z.string().trim().optional(),
    innovationPractices: z.string().trim().optional(),
    institutionalContribution: z.string().trim().optional(),
});

export const facultyRecordSchema = z.object({
    employeeId: z.string().trim().optional(),
    joiningDate: z.string().trim().optional(),
    biography: z.string().trim().optional(),
    specialization: z.string().trim().optional(),
    researchInterests: z.array(z.string().trim().min(1)).default([]),
    professionalMemberships: z.array(z.string().trim().min(1)).default([]),
    certifications: z.array(z.string().trim().min(1)).default([]),
    awards: z.array(z.string().trim().min(1)).default([]),
    coursesTaught: z.array(z.string().trim().min(1)).default([]),
    administrativeResponsibilities: z.array(z.string().trim().min(1)).default([]),
    degrees: z.array(degreeSchema).default([]),
    casEntries: z.array(casEntrySchema).default([]),
    pbasEntries: z.array(pbasEntrySchema).default([]),
    aqarEntries: z.array(aqarEntrySchema).default([]),
});

export type FacultyRecordInput = z.input<typeof facultyRecordSchema>;
