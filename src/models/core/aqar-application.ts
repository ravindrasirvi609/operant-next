import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type AqarStatus =
    | "Draft"
    | "Submitted"
    | "Under Review"
    | "Committee Review"
    | "Approved"
    | "Rejected";

export interface IAqarResearchPaper {
    paperTitle: string;
    journalName: string;
    authors: string;
    publicationYear: number;
    issnNumber?: string;
    year?: string;
    impactFactor?: string;
    indexedIn?: string;
    links?: string;
    proof?: string;
    ifProof?: string;
}

export interface IAqarSeedMoneyProject {
    schemeOrProjectTitle: string;
    principalInvestigatorName: string;
    coInvestigator?: string;
    fundingAgencyName: string;
    fundingAgencyType: "Government" | "Non-Government";
    awardYear: number;
    projectDuration?: string;
    fundsInInr?: number;
    projectCategory?: "Major" | "Minor";
    status?: string;
    year?: string;
    proof?: string;
}

export interface IAqarAwardRecognition {
    teacherName: string;
    awardDate?: string;
    pan?: string;
    designation?: string;
    awardName: string;
    level: "State" | "National" | "International";
    awardAgencyName: string;
    incentiveDetails?: string;
    year?: string;
    proof?: string;
}

export interface IAqarFellowshipSupport {
    teacherName: string;
    fellowshipName: string;
    awardingAgency: string;
    awardYear: number;
    level: "National" | "International";
    year?: string;
    proof?: string;
}

export interface IAqarResearchFellow {
    fellowName: string;
    enrolmentDate?: string;
    fellowshipDuration?: string;
    fellowshipType: string;
    grantingAgency: string;
    qualifyingExam?: string;
    year?: string;
    proof?: string;
}

export interface IAqarPatent {
    type: string;
    patenterName: string;
    patentNumber?: string;
    filingDate?: string;
    publishedDate?: string;
    title: string;
    status: string;
    level: "National" | "International";
    awardYear?: number;
    academicYear?: string;
    proof?: string;
}

export interface IAqarPhdAward {
    scholarName: string;
    departmentName: string;
    guideName: string;
    thesisTitle: string;
    registrationDate?: string;
    gender?: string;
    category?: string;
    degree?: string;
    awardStatus: "Awarded" | "Submitted";
    scholarRegistrationYear?: number;
    awardYear?: number;
    year?: string;
    proof?: string;
}

export interface IAqarBookChapter {
    type: string;
    titleOfWork: string;
    titleOfChapter?: string;
    paperTitle?: string;
    translationWork?: string;
    proceedingsTitle?: string;
    conferenceName?: string;
    level?: "National" | "International";
    publicationYear?: number;
    isbnIssnNumber?: string;
    affiliationInstitute?: string;
    publisherName?: string;
    academicYear?: string;
    proof?: string;
}

export interface IAqarEContent {
    moduleName: string;
    creationType: string;
    platform: string;
    academicYear?: string;
    linkToContent?: string;
    proof?: string;
}

export interface IAqarConsultancyService {
    consultantName: string;
    consultancyProjectName: string;
    sponsoringAgencyContact: string;
    consultancyYear?: number;
    revenueGeneratedInInr?: number;
    year?: string;
    proof?: string;
}

export interface IAqarFinancialSupport {
    conferenceName: string;
    professionalBodyName?: string;
    amountOfSupport?: number;
    panNo?: string;
    year?: string;
    proof?: string;
}

export interface IAqarFdp {
    programTitle: string;
    organizedBy: string;
    durationFrom?: string;
    durationTo?: string;
    year?: string;
    proof?: string;
}

export interface IAqarReviewCommitteeEntry {
    reviewerId: Types.ObjectId;
    reviewerName?: string;
    reviewerRole?: string;
    designation: string;
    remarks?: string;
    decision: string;
    stage: "Department Head" | "AQAR Committee" | "Admin";
    reviewedAt: Date;
}

export interface IAqarStatusLog {
    status: AqarStatus;
    actorId?: Types.ObjectId;
    actorName?: string;
    actorRole?: string;
    remarks?: string;
    changedAt: Date;
}

export interface IAqarApplication extends Document {
    facultyId: Types.ObjectId;
    academicYear: string;
    reportingPeriod: {
        fromDate: string;
        toDate: string;
    };
    facultyContribution: {
        researchPapers: IAqarResearchPaper[];
        seedMoneyProjects: IAqarSeedMoneyProject[];
        awardsRecognition: IAqarAwardRecognition[];
        fellowships: IAqarFellowshipSupport[];
        researchFellows: IAqarResearchFellow[];
        patents: IAqarPatent[];
        phdAwards: IAqarPhdAward[];
        booksChapters: IAqarBookChapter[];
        eContentDeveloped: IAqarEContent[];
        consultancyServices: IAqarConsultancyService[];
        financialSupport: IAqarFinancialSupport[];
        facultyDevelopmentProgrammes: IAqarFdp[];
    };
    metrics: {
        researchPaperCount: number;
        seedMoneyProjectCount: number;
        awardRecognitionCount: number;
        fellowshipCount: number;
        researchFellowCount: number;
        patentCount: number;
        phdAwardCount: number;
        bookChapterCount: number;
        eContentCount: number;
        consultancyCount: number;
        financialSupportCount: number;
        fdpCount: number;
        totalContributionIndex: number;
    };
    reviewCommittee: IAqarReviewCommitteeEntry[];
    statusLogs: IAqarStatusLog[];
    status: AqarStatus;
    submittedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

function createStringSchema(required = false) {
    return { type: String, trim: true, ...(required ? { required: true } : {}) };
}

const ResearchPaperSchema = new Schema<IAqarResearchPaper>(
    {
        paperTitle: createStringSchema(true),
        journalName: createStringSchema(true),
        authors: createStringSchema(true),
        publicationYear: { type: Number, required: true },
        issnNumber: createStringSchema(),
        year: createStringSchema(),
        impactFactor: createStringSchema(),
        indexedIn: createStringSchema(),
        links: createStringSchema(),
        proof: createStringSchema(),
        ifProof: createStringSchema(),
    },
    { _id: false }
);

const SeedMoneyProjectSchema = new Schema<IAqarSeedMoneyProject>(
    {
        schemeOrProjectTitle: createStringSchema(true),
        principalInvestigatorName: createStringSchema(true),
        coInvestigator: createStringSchema(),
        fundingAgencyName: createStringSchema(true),
        fundingAgencyType: { type: String, enum: ["Government", "Non-Government"], required: true },
        awardYear: { type: Number, required: true },
        projectDuration: createStringSchema(),
        fundsInInr: { type: Number, default: 0 },
        projectCategory: { type: String, enum: ["Major", "Minor"] },
        status: createStringSchema(),
        year: createStringSchema(),
        proof: createStringSchema(),
    },
    { _id: false }
);

const AwardRecognitionSchema = new Schema<IAqarAwardRecognition>(
    {
        teacherName: createStringSchema(true),
        awardDate: createStringSchema(),
        pan: createStringSchema(),
        designation: createStringSchema(),
        awardName: createStringSchema(true),
        level: { type: String, enum: ["State", "National", "International"], required: true },
        awardAgencyName: createStringSchema(true),
        incentiveDetails: createStringSchema(),
        year: createStringSchema(),
        proof: createStringSchema(),
    },
    { _id: false }
);

const FellowshipSupportSchema = new Schema<IAqarFellowshipSupport>(
    {
        teacherName: createStringSchema(true),
        fellowshipName: createStringSchema(true),
        awardingAgency: createStringSchema(true),
        awardYear: { type: Number, required: true },
        level: { type: String, enum: ["National", "International"], required: true },
        year: createStringSchema(),
        proof: createStringSchema(),
    },
    { _id: false }
);

const ResearchFellowSchema = new Schema<IAqarResearchFellow>(
    {
        fellowName: createStringSchema(true),
        enrolmentDate: createStringSchema(),
        fellowshipDuration: createStringSchema(),
        fellowshipType: createStringSchema(true),
        grantingAgency: createStringSchema(true),
        qualifyingExam: createStringSchema(),
        year: createStringSchema(),
        proof: createStringSchema(),
    },
    { _id: false }
);

const PatentSchema = new Schema<IAqarPatent>(
    {
        type: createStringSchema(true),
        patenterName: createStringSchema(true),
        patentNumber: createStringSchema(),
        filingDate: createStringSchema(),
        publishedDate: createStringSchema(),
        title: createStringSchema(true),
        status: createStringSchema(true),
        level: { type: String, enum: ["National", "International"], required: true },
        awardYear: { type: Number },
        academicYear: createStringSchema(),
        proof: createStringSchema(),
    },
    { _id: false }
);

const PhdAwardSchema = new Schema<IAqarPhdAward>(
    {
        scholarName: createStringSchema(true),
        departmentName: createStringSchema(true),
        guideName: createStringSchema(true),
        thesisTitle: createStringSchema(true),
        registrationDate: createStringSchema(),
        gender: createStringSchema(),
        category: createStringSchema(),
        degree: createStringSchema(),
        awardStatus: { type: String, enum: ["Awarded", "Submitted"], required: true },
        scholarRegistrationYear: { type: Number },
        awardYear: { type: Number },
        year: createStringSchema(),
        proof: createStringSchema(),
    },
    { _id: false }
);

const BookChapterSchema = new Schema<IAqarBookChapter>(
    {
        type: createStringSchema(true),
        titleOfWork: createStringSchema(true),
        titleOfChapter: createStringSchema(),
        paperTitle: createStringSchema(),
        translationWork: createStringSchema(),
        proceedingsTitle: createStringSchema(),
        conferenceName: createStringSchema(),
        level: { type: String, enum: ["National", "International"] },
        publicationYear: { type: Number },
        isbnIssnNumber: createStringSchema(),
        affiliationInstitute: createStringSchema(),
        publisherName: createStringSchema(),
        academicYear: createStringSchema(),
        proof: createStringSchema(),
    },
    { _id: false }
);

const EContentSchema = new Schema<IAqarEContent>(
    {
        moduleName: createStringSchema(true),
        creationType: createStringSchema(true),
        platform: createStringSchema(true),
        academicYear: createStringSchema(),
        linkToContent: createStringSchema(),
        proof: createStringSchema(),
    },
    { _id: false }
);

const ConsultancyServiceSchema = new Schema<IAqarConsultancyService>(
    {
        consultantName: createStringSchema(true),
        consultancyProjectName: createStringSchema(true),
        sponsoringAgencyContact: createStringSchema(true),
        consultancyYear: { type: Number },
        revenueGeneratedInInr: { type: Number, default: 0 },
        year: createStringSchema(),
        proof: createStringSchema(),
    },
    { _id: false }
);

const FinancialSupportSchema = new Schema<IAqarFinancialSupport>(
    {
        conferenceName: createStringSchema(true),
        professionalBodyName: createStringSchema(),
        amountOfSupport: { type: Number, default: 0 },
        panNo: createStringSchema(),
        year: createStringSchema(),
        proof: createStringSchema(),
    },
    { _id: false }
);

const FdpSchema = new Schema<IAqarFdp>(
    {
        programTitle: createStringSchema(true),
        organizedBy: createStringSchema(true),
        durationFrom: createStringSchema(),
        durationTo: createStringSchema(),
        year: createStringSchema(),
        proof: createStringSchema(),
    },
    { _id: false }
);

const ReviewCommitteeSchema = new Schema<IAqarReviewCommitteeEntry>(
    {
        reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        reviewerName: createStringSchema(),
        reviewerRole: createStringSchema(),
        designation: createStringSchema(true),
        remarks: createStringSchema(),
        decision: createStringSchema(true),
        stage: {
            type: String,
            enum: ["Department Head", "AQAR Committee", "Admin"],
            required: true,
        },
        reviewedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const StatusLogSchema = new Schema<IAqarStatusLog>(
    {
        status: {
            type: String,
            enum: ["Draft", "Submitted", "Under Review", "Committee Review", "Approved", "Rejected"],
            required: true,
        },
        actorId: { type: Schema.Types.ObjectId, ref: "User" },
        actorName: createStringSchema(),
        actorRole: createStringSchema(),
        remarks: createStringSchema(),
        changedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const AqarApplicationSchema = new Schema<IAqarApplication>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        academicYear: { type: String, required: true, trim: true, index: true },
        reportingPeriod: {
            fromDate: createStringSchema(true),
            toDate: createStringSchema(true),
        },
        facultyContribution: {
            researchPapers: { type: [ResearchPaperSchema], default: [] },
            seedMoneyProjects: { type: [SeedMoneyProjectSchema], default: [] },
            awardsRecognition: { type: [AwardRecognitionSchema], default: [] },
            fellowships: { type: [FellowshipSupportSchema], default: [] },
            researchFellows: { type: [ResearchFellowSchema], default: [] },
            patents: { type: [PatentSchema], default: [] },
            phdAwards: { type: [PhdAwardSchema], default: [] },
            booksChapters: { type: [BookChapterSchema], default: [] },
            eContentDeveloped: { type: [EContentSchema], default: [] },
            consultancyServices: { type: [ConsultancyServiceSchema], default: [] },
            financialSupport: { type: [FinancialSupportSchema], default: [] },
            facultyDevelopmentProgrammes: { type: [FdpSchema], default: [] },
        },
        metrics: {
            researchPaperCount: { type: Number, default: 0 },
            seedMoneyProjectCount: { type: Number, default: 0 },
            awardRecognitionCount: { type: Number, default: 0 },
            fellowshipCount: { type: Number, default: 0 },
            researchFellowCount: { type: Number, default: 0 },
            patentCount: { type: Number, default: 0 },
            phdAwardCount: { type: Number, default: 0 },
            bookChapterCount: { type: Number, default: 0 },
            eContentCount: { type: Number, default: 0 },
            consultancyCount: { type: Number, default: 0 },
            financialSupportCount: { type: Number, default: 0 },
            fdpCount: { type: Number, default: 0 },
            totalContributionIndex: { type: Number, default: 0 },
        },
        reviewCommittee: { type: [ReviewCommitteeSchema], default: [] },
        statusLogs: { type: [StatusLogSchema], default: [] },
        status: {
            type: String,
            enum: ["Draft", "Submitted", "Under Review", "Committee Review", "Approved", "Rejected"],
            default: "Draft",
            index: true,
        },
        submittedAt: { type: Date },
    },
    {
        timestamps: true,
        collection: "aqar_applications",
    }
);

AqarApplicationSchema.index({ facultyId: 1, academicYear: 1 });
AqarApplicationSchema.index({ facultyId: 1, status: 1, updatedAt: -1 });

const AqarApplication: Model<IAqarApplication> =
    mongoose.models.AqarApplication ||
    mongoose.model<IAqarApplication>("AqarApplication", AqarApplicationSchema);

export default AqarApplication;
