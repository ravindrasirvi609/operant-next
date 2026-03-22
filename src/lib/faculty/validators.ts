import { z } from "zod";

const optionalNumberField = z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
        return undefined;
    }

    return Number(value);
}, z.number().min(0).optional());

const optionalYearField = z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
        return undefined;
    }

    return Number(value);
}, z.number().int().min(1900).optional());

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
    courseId: z.string().trim().optional(),
    documentId: z.string().trim().optional(),
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

const teachingSummarySchema = z.object({
    _id: z.string().optional(),
    documentId: z.string().trim().optional(),
    academicYear: z.string().trim().min(4, "Academic year is required."),
    classesTaken: z.coerce.number().min(0).default(0),
    coursePreparationHours: z.coerce.number().min(0).default(0),
    coursesTaught: z.array(z.string().trim().min(1)).default([]),
    mentoringCount: z.coerce.number().min(0).default(0),
    labSupervisionCount: z.coerce.number().min(0).default(0),
    feedbackSummary: z.string().trim().optional(),
});

const resultSummarySchema = z.object({
    _id: z.string().optional(),
    documentId: z.string().trim().optional(),
    academicYear: z.string().trim().min(4, "Academic year is required."),
    subjectName: z.string().trim().min(2, "Subject name is required."),
    appearedStudents: z.coerce.number().int().min(0).default(0),
    passedStudents: z.coerce.number().int().min(0).default(0),
    universityRankStudents: z.coerce.number().int().min(0).default(0),
});

const administrativeRoleSchema = z.object({
    _id: z.string().optional(),
    documentId: z.string().trim().optional(),
    academicYear: z.string().trim().optional(),
    roleName: z.string().trim().min(2, "Role name is required."),
    committeeName: z.string().trim().optional(),
    responsibilityDescription: z.string().trim().optional(),
});

const publicationSchema = z.object({
    _id: z.string().optional(),
    documentId: z.string().trim().optional(),
    title: z.string().trim().min(2, "Publication title is required."),
    journalName: z.string().trim().optional(),
    publisher: z.string().trim().optional(),
    publicationType: z.enum(["Scopus", "UGC", "WebOfScience", "Book"]).default("UGC"),
    impactFactor: z.coerce.number().min(0).default(0),
    isbnIssn: z.string().trim().optional(),
    doi: z.string().trim().optional(),
    publicationDate: z.string().trim().optional(),
    indexedIn: z.string().trim().optional(),
    authorPosition: z.enum(["First", "Second", "Corresponding", "CoAuthor", "Other"]).optional(),
});

const bookSchema = z.object({
    _id: z.string().optional(),
    documentId: z.string().trim().optional(),
    title: z.string().trim().min(2, "Book title is required."),
    publisher: z.string().trim().optional(),
    isbn: z.string().trim().optional(),
    publicationDate: z.string().trim().optional(),
    bookType: z.enum(["Textbook", "Reference", "Chapter"]).default("Textbook"),
});

const patentSchema = z.object({
    _id: z.string().optional(),
    documentId: z.string().trim().optional(),
    title: z.string().trim().min(2, "Patent title is required."),
    patentNumber: z.string().trim().optional(),
    status: z.enum(["Filed", "Published", "Granted"]).default("Filed"),
    filingDate: z.string().trim().optional(),
    grantDate: z.string().trim().optional(),
});

const researchProjectSchema = z.object({
    _id: z.string().optional(),
    documentId: z.string().trim().optional(),
    title: z.string().trim().min(2, "Project title is required."),
    fundingAgency: z.string().trim().optional(),
    projectType: z.enum(["Minor", "Major", "Industry"]).default("Minor"),
    amountSanctioned: z.coerce.number().min(0).default(0),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    status: z.enum(["Planned", "Ongoing", "Completed", "Closed"]).default("Ongoing"),
    principalInvestigator: z.boolean().default(false),
});

const eventParticipationSchema = z.object({
    _id: z.string().optional(),
    documentId: z.string().trim().optional(),
    title: z.string().trim().min(2, "Event title is required."),
    organizer: z.string().trim().min(2, "Organizer is required."),
    eventType: z.enum(["Seminar", "Workshop", "Conference", "Symposium", "Webinar", "Other"]).default("Conference"),
    level: z.enum(["College", "State", "National", "International"]).default("College"),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    location: z.string().trim().optional(),
    role: z.enum(["Participant", "ResourcePerson", "Chair"]).default("Participant"),
    paperPresented: z.boolean().default(false),
    paperTitle: z.string().trim().optional(),
    organized: z.boolean().default(false),
});

const consultancySchema = z.object({
    _id: z.string().optional(),
    documentId: z.string().trim().optional(),
    clientName: z.string().trim().min(2, "Client name is required."),
    projectTitle: z.string().trim().min(2, "Project title is required."),
    revenueGenerated: z.coerce.number().min(0).default(0),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
});

const awardSchema = z.object({
    _id: z.string().optional(),
    documentId: z.string().trim().optional(),
    title: z.string().trim().min(2, "Award title is required."),
    awardingBody: z.string().trim().optional(),
    awardLevel: z.enum(["College", "State", "National", "International"]).default("College"),
    awardDate: z.string().trim().optional(),
});

const phdGuidanceSchema = z.object({
    _id: z.string().optional(),
    documentId: z.string().trim().optional(),
    scholarName: z.string().trim().min(2, "Scholar name is required."),
    universityName: z.string().trim().min(2, "University name is required."),
    registrationYear: z.coerce.number().int().min(1900),
    thesisTitle: z.string().trim().min(2, "Thesis title is required."),
    status: z.enum(["ongoing", "completed"]).default("ongoing"),
    completionYear: optionalYearField,
});

const econtentSchema = z.object({
    _id: z.string().optional(),
    title: z.string().trim().min(2, "Title is required."),
    platform: z.enum(["youtube", "moodle", "swayam", "other"]).default("other"),
    url: z.string().trim().min(1, "Content URL is required."),
    contentType: z.enum(["video", "module", "ppt", "other"]).default("other"),
    academicYear: z.string().trim().min(4, "Academic year is required."),
});

const moocCourseSchema = z.object({
    _id: z.string().optional(),
    certificateDocumentId: z.string().trim().optional(),
    courseName: z.string().trim().min(2, "Course name is required."),
    platform: z.string().trim().min(2, "Platform is required."),
    university: z.string().trim().optional(),
    durationWeeks: optionalNumberField,
    grade: z.string().trim().optional(),
    completionDate: z.string().trim().min(1, "Completion date is required."),
});

const fdpSchema = z.object({
    _id: z.string().optional(),
    documentId: z.string().trim().optional(),
    title: z.string().trim().min(2, "Programme title is required."),
    sponsoredBy: z.string().trim().optional(),
    level: z.enum(["College", "State", "National", "International"]).default("College"),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    participantsCount: z.coerce.number().int().min(0).default(0),
});

const institutionalContributionSchema = z.object({
    _id: z.string().optional(),
    documentId: z.string().trim().optional(),
    academicYear: z.string().trim().min(4, "Academic year is required."),
    activityTitle: z.string().trim().min(2, "Activity title is required."),
    role: z.string().trim().min(2, "Role is required."),
    impactLevel: z.enum(["dept", "institute", "university"]).default("dept"),
    scoreWeightage: z.coerce.number().min(0).default(0),
});

const socialExtensionSchema = z.object({
    _id: z.string().optional(),
    documentId: z.string().trim().optional(),
    academicYear: z.string().trim().optional(),
    programName: z.string().trim().min(2, "Programme name is required."),
    activityName: z.string().trim().min(2, "Activity name is required."),
    hoursContributed: z.coerce.number().min(0).default(0),
});

const kpiTargetSchema = z.object({
    _id: z.string().optional(),
    academicYear: z.string().trim().min(4, "Academic year is required."),
    researchPublicationsTarget: z.coerce.number().min(0).default(0),
    fdpTarget: z.coerce.number().min(0).default(0),
    consultancyTarget: z.coerce.number().min(0).default(0),
    resultTargetPercentage: z.coerce.number().min(0).default(0),
});

const kpiAchievementSchema = z.object({
    _id: z.string().optional(),
    academicYear: z.string().trim().min(4, "Academic year is required."),
    publicationsDone: z.coerce.number().min(0).default(0),
    fdpConducted: z.coerce.number().min(0).default(0),
    consultancyGenerated: z.coerce.number().min(0).default(0),
    resultPercentage: z.coerce.number().min(0).default(0),
    overallKpiScore: z.coerce.number().min(0).default(0),
});

const aqarSummarySchema = z.object({
    _id: z.string().optional(),
    academicYear: z.string().trim().min(4, "Academic year is required."),
    teachingScore: z.coerce.number().min(0).default(0),
    researchScore: z.coerce.number().min(0).default(0),
    publicationScore: z.coerce.number().min(0).default(0),
    administrativeScore: z.coerce.number().min(0).default(0),
    extensionScore: z.coerce.number().min(0).default(0),
    awardScore: z.coerce.number().min(0).default(0),
    apiTotalScore: z.coerce.number().min(0).default(0),
    performanceGrade: z.string().trim().optional(),
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
    teachingSummaries: z.array(teachingSummarySchema).default([]),
    teachingLoads: z.array(teachingLoadSchema).default([]),
    resultSummaries: z.array(resultSummarySchema).default([]),
    publications: z.array(publicationSchema).default([]),
    books: z.array(bookSchema).default([]),
    patents: z.array(patentSchema).default([]),
    researchProjects: z.array(researchProjectSchema).default([]),
    eventParticipations: z.array(eventParticipationSchema).default([]),
    consultancies: z.array(consultancySchema).default([]),
    awards: z.array(awardSchema).default([]),
    phdGuidances: z.array(phdGuidanceSchema).default([]),
    econtents: z.array(econtentSchema).default([]),
    moocCourses: z.array(moocCourseSchema).default([]),
    administrativeRoles: z.array(administrativeRoleSchema).default([]),
    institutionalContributions: z.array(institutionalContributionSchema).default([]),
    facultyDevelopmentProgrammes: z.array(fdpSchema).default([]),
    socialExtensionActivities: z.array(socialExtensionSchema).default([]),
    kpiTargets: z.array(kpiTargetSchema).default([]),
    kpiAchievements: z.array(kpiAchievementSchema).default([]),
    aqarSummaries: z.array(aqarSummarySchema).default([]),
});

export type FacultyRecordInput = z.input<typeof facultyRecordSchema>;
