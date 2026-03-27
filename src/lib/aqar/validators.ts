import { z } from "zod";

export const aqarStatusValues = [
    "Draft",
    "Submitted",
    "Under Review",
    "Committee Review",
    "Approved",
    "Rejected",
] as const;

const yearSchema = z.coerce.number().int().min(1900).max(2100);
const optionalYearString = z.string().trim().optional();

const researchPaperSchema = z.object({
    paperTitle: z.string().trim().min(2, "Paper title is required."),
    journalName: z.string().trim().min(2, "Journal name is required."),
    authors: z.string().trim().min(2, "Author name is required."),
    publicationYear: yearSchema,
    issnNumber: z.string().trim().optional(),
    year: optionalYearString,
    impactFactor: z.string().trim().optional(),
    indexedIn: z.string().trim().optional(),
    links: z.string().trim().optional(),
    proof: z.string().trim().optional(),
    ifProof: z.string().trim().optional(),
});

const seedMoneyProjectSchema = z.object({
    schemeOrProjectTitle: z.string().trim().min(2, "Scheme or project title is required."),
    principalInvestigatorName: z.string().trim().min(2, "Principal investigator name is required."),
    coInvestigator: z.string().trim().optional(),
    fundingAgencyName: z.string().trim().min(2, "Funding agency name is required."),
    fundingAgencyType: z.enum(["Government", "Non-Government"]),
    awardYear: yearSchema,
    projectDuration: z.string().trim().optional(),
    fundsInInr: z.coerce.number().min(0).optional(),
    projectCategory: z.enum(["Major", "Minor"]).optional(),
    status: z.string().trim().optional(),
    year: optionalYearString,
    proof: z.string().trim().optional(),
});

const awardRecognitionSchema = z.object({
    teacherName: z.string().trim().min(2, "Teacher name is required."),
    awardDate: z.string().trim().optional(),
    pan: z.string().trim().optional(),
    designation: z.string().trim().optional(),
    awardName: z.string().trim().min(2, "Award name is required."),
    level: z.enum(["State", "National", "International"]),
    awardAgencyName: z.string().trim().min(2, "Award agency name is required."),
    incentiveDetails: z.string().trim().optional(),
    year: optionalYearString,
    proof: z.string().trim().optional(),
});

const fellowshipSupportSchema = z.object({
    teacherName: z.string().trim().min(2, "Teacher name is required."),
    fellowshipName: z.string().trim().min(2, "Fellowship name is required."),
    awardingAgency: z.string().trim().min(2, "Awarding agency is required."),
    awardYear: yearSchema,
    level: z.enum(["National", "International"]),
    year: optionalYearString,
    proof: z.string().trim().optional(),
});

const researchFellowSchema = z.object({
    fellowName: z.string().trim().min(2, "Research fellow name is required."),
    enrolmentDate: z.string().trim().optional(),
    fellowshipDuration: z.string().trim().optional(),
    fellowshipType: z.string().trim().min(2, "Fellowship type is required."),
    grantingAgency: z.string().trim().min(2, "Granting agency is required."),
    qualifyingExam: z.string().trim().optional(),
    year: optionalYearString,
    proof: z.string().trim().optional(),
});

const patentSchema = z.object({
    type: z.string().trim().min(2, "Type is required."),
    patenterName: z.string().trim().min(2, "Patenter name is required."),
    patentNumber: z.string().trim().optional(),
    filingDate: z.string().trim().optional(),
    publishedDate: z.string().trim().optional(),
    title: z.string().trim().min(2, "Patent title is required."),
    status: z.string().trim().min(2, "Patent status is required."),
    level: z.enum(["National", "International"]),
    awardYear: yearSchema.optional(),
    academicYear: z.string().trim().optional(),
    proof: z.string().trim().optional(),
});

const phdAwardSchema = z.object({
    scholarName: z.string().trim().min(2, "Scholar name is required."),
    departmentName: z.string().trim().min(2, "Department name is required."),
    guideName: z.string().trim().min(2, "Guide name is required."),
    thesisTitle: z.string().trim().min(2, "Thesis title is required."),
    registrationDate: z.string().trim().optional(),
    gender: z.string().trim().optional(),
    category: z.string().trim().optional(),
    degree: z.string().trim().optional(),
    awardStatus: z.enum(["Awarded", "Submitted"]),
    scholarRegistrationYear: yearSchema.optional(),
    awardYear: yearSchema.optional(),
    year: optionalYearString,
    proof: z.string().trim().optional(),
});

const bookChapterSchema = z.object({
    type: z.string().trim().min(2, "Type is required."),
    titleOfWork: z.string().trim().min(2, "Title of work is required."),
    titleOfChapter: z.string().trim().optional(),
    paperTitle: z.string().trim().optional(),
    translationWork: z.string().trim().optional(),
    proceedingsTitle: z.string().trim().optional(),
    conferenceName: z.string().trim().optional(),
    level: z.enum(["National", "International"]).optional(),
    publicationYear: yearSchema.optional(),
    isbnIssnNumber: z.string().trim().optional(),
    affiliationInstitute: z.string().trim().optional(),
    publisherName: z.string().trim().optional(),
    academicYear: z.string().trim().optional(),
    proof: z.string().trim().optional(),
});

const eContentSchema = z.object({
    moduleName: z.string().trim().min(2, "Module or course name is required."),
    creationType: z.string().trim().min(2, "Creation type is required."),
    platform: z.string().trim().min(2, "Platform is required."),
    academicYear: z.string().trim().optional(),
    linkToContent: z.string().trim().optional(),
    proof: z.string().trim().optional(),
});

const consultancySchema = z.object({
    consultantName: z.string().trim().min(2, "Consultant name is required."),
    consultancyProjectName: z.string().trim().min(2, "Consultancy project name is required."),
    sponsoringAgencyContact: z.string().trim().min(2, "Consulting or sponsoring agency is required."),
    consultancyYear: yearSchema.optional(),
    revenueGeneratedInInr: z.coerce.number().min(0).optional(),
    year: optionalYearString,
    proof: z.string().trim().optional(),
});

const financialSupportSchema = z.object({
    conferenceName: z.string().trim().min(2, "Conference name is required."),
    professionalBodyName: z.string().trim().optional(),
    amountOfSupport: z.coerce.number().min(0).optional(),
    panNo: z.string().trim().optional(),
    year: optionalYearString,
    proof: z.string().trim().optional(),
});

const fdpSchema = z.object({
    programTitle: z.string().trim().min(2, "Programme title is required."),
    organizedBy: z.string().trim().min(2, "Organizer is required."),
    durationFrom: z.string().trim().optional(),
    durationTo: z.string().trim().optional(),
    year: optionalYearString,
    proof: z.string().trim().optional(),
});

export const aqarApplicationSchema = z.object({
    academicYear: z.string().trim().min(4, "Academic year is required."),
    reportingPeriod: z.object({
        fromDate: z.string().trim().min(4, "Reporting start date is required."),
        toDate: z.string().trim().min(4, "Reporting end date is required."),
    }),
    facultyContribution: z.object({
        researchPapers: z.array(researchPaperSchema).default([]),
        seedMoneyProjects: z.array(seedMoneyProjectSchema).default([]),
        awardsRecognition: z.array(awardRecognitionSchema).default([]),
        fellowships: z.array(fellowshipSupportSchema).default([]),
        researchFellows: z.array(researchFellowSchema).default([]),
        patents: z.array(patentSchema).default([]),
        phdAwards: z.array(phdAwardSchema).default([]),
        booksChapters: z.array(bookChapterSchema).default([]),
        eContentDeveloped: z.array(eContentSchema).default([]),
        consultancyServices: z.array(consultancySchema).default([]),
        financialSupport: z.array(financialSupportSchema).default([]),
        facultyDevelopmentProgrammes: z.array(fdpSchema).default([]),
    }),
});

export const aqarReviewSchema = z.object({
    remarks: z.string().trim().min(2, "Review remarks are required."),
    decision: z.enum(["Forward", "Recommend", "Reject"]),
    overrideReason: z.string().trim().min(5).optional(),
});

export const aqarApprovalSchema = z.object({
    remarks: z.string().trim().min(2, "Approval remarks are required."),
    decision: z.enum(["Approve", "Reject"]),
    overrideReason: z.string().trim().min(5).optional(),
});

export type AqarApplicationInput = z.infer<typeof aqarApplicationSchema>;
