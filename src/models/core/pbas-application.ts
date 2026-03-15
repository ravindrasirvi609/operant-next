import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type PbasStatus =
    | "Draft"
    | "Submitted"
    | "Under Review"
    | "Committee Review"
    | "Approved"
    | "Rejected";

export interface IPbasResearchPaper {
    title: string;
    journal: string;
    year: number;
    issn?: string;
    indexing?: string;
}

export interface IPbasBook {
    title: string;
    publisher: string;
    isbn?: string;
    year: number;
}

export interface IPbasPatent {
    title: string;
    year: number;
    status: string;
}

export interface IPbasConference {
    title: string;
    organizer: string;
    year: number;
    type: string;
}

export interface IPbasProject {
    title: string;
    fundingAgency: string;
    amount: number;
    year: number;
}

export interface IPbasCommittee {
    committeeName: string;
    role?: string;
    year?: number;
}

export interface IPbasAdministrativeDuty {
    title: string;
    year?: number;
}

export interface IPbasExamDuty {
    duty: string;
    year?: number;
}

export interface IPbasStudentGuidance {
    activity: string;
    count: number;
}

export interface IPbasExtensionActivity {
    title: string;
    role?: string;
    year?: number;
}

export interface IPbasReviewCommitteeEntry {
    reviewerId: Types.ObjectId;
    reviewerName?: string;
    reviewerRole?: string;
    designation: string;
    remarks?: string;
    decision: string;
    stage: "Department Head" | "PBAS Committee" | "Admin";
    reviewedAt: Date;
}

export interface IPbasStatusLog {
    status: PbasStatus;
    actorId?: Types.ObjectId;
    actorName?: string;
    actorRole?: string;
    remarks?: string;
    changedAt: Date;
}

export interface IPbasApplication extends Document {
    facultyId: Types.ObjectId;
    academicYear: string;
    currentDesignation: string;
    appraisalPeriod: {
        fromDate: string;
        toDate: string;
    };
    category1: {
        classesTaken: number;
        coursePreparationHours: number;
        coursesTaught: string[];
        mentoringCount: number;
        labSupervisionCount: number;
        feedbackSummary?: string;
    };
    category2: {
        researchPapers: IPbasResearchPaper[];
        books: IPbasBook[];
        patents: IPbasPatent[];
        conferences: IPbasConference[];
        projects: IPbasProject[];
    };
    category3: {
        committees: IPbasCommittee[];
        administrativeDuties: IPbasAdministrativeDuty[];
        examDuties: IPbasExamDuty[];
        studentGuidance: IPbasStudentGuidance[];
        extensionActivities: IPbasExtensionActivity[];
    };
    apiScore: {
        teachingActivities: number;
        researchAcademicContribution: number;
        institutionalResponsibilities: number;
        totalScore: number;
    };
    reviewCommittee: IPbasReviewCommitteeEntry[];
    statusLogs: IPbasStatusLog[];
    status: PbasStatus;
    submittedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ResearchPaperSchema = new Schema<IPbasResearchPaper>(
    {
        title: { type: String, required: true, trim: true },
        journal: { type: String, required: true, trim: true },
        year: { type: Number, required: true },
        issn: { type: String, trim: true },
        indexing: { type: String, trim: true },
    },
    { _id: false }
);

const BookSchema = new Schema<IPbasBook>(
    {
        title: { type: String, required: true, trim: true },
        publisher: { type: String, required: true, trim: true },
        isbn: { type: String, trim: true },
        year: { type: Number, required: true },
    },
    { _id: false }
);

const PatentSchema = new Schema<IPbasPatent>(
    {
        title: { type: String, required: true, trim: true },
        year: { type: Number, required: true },
        status: { type: String, required: true, trim: true },
    },
    { _id: false }
);

const ConferenceSchema = new Schema<IPbasConference>(
    {
        title: { type: String, required: true, trim: true },
        organizer: { type: String, required: true, trim: true },
        year: { type: Number, required: true },
        type: { type: String, required: true, trim: true },
    },
    { _id: false }
);

const ProjectSchema = new Schema<IPbasProject>(
    {
        title: { type: String, required: true, trim: true },
        fundingAgency: { type: String, required: true, trim: true },
        amount: { type: Number, default: 0 },
        year: { type: Number, required: true },
    },
    { _id: false }
);

const CommitteeSchema = new Schema<IPbasCommittee>(
    {
        committeeName: { type: String, required: true, trim: true },
        role: { type: String, trim: true },
        year: { type: Number },
    },
    { _id: false }
);

const AdministrativeDutySchema = new Schema<IPbasAdministrativeDuty>(
    {
        title: { type: String, required: true, trim: true },
        year: { type: Number },
    },
    { _id: false }
);

const ExamDutySchema = new Schema<IPbasExamDuty>(
    {
        duty: { type: String, required: true, trim: true },
        year: { type: Number },
    },
    { _id: false }
);

const StudentGuidanceSchema = new Schema<IPbasStudentGuidance>(
    {
        activity: { type: String, required: true, trim: true },
        count: { type: Number, default: 0 },
    },
    { _id: false }
);

const ExtensionActivitySchema = new Schema<IPbasExtensionActivity>(
    {
        title: { type: String, required: true, trim: true },
        role: { type: String, trim: true },
        year: { type: Number },
    },
    { _id: false }
);

const ReviewCommitteeSchema = new Schema<IPbasReviewCommitteeEntry>(
    {
        reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        reviewerName: { type: String, trim: true },
        reviewerRole: { type: String, trim: true },
        designation: { type: String, required: true, trim: true },
        remarks: { type: String, trim: true },
        decision: { type: String, required: true, trim: true },
        stage: {
            type: String,
            enum: ["Department Head", "PBAS Committee", "Admin"],
            required: true,
        },
        reviewedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const StatusLogSchema = new Schema<IPbasStatusLog>(
    {
        status: {
            type: String,
            enum: ["Draft", "Submitted", "Under Review", "Committee Review", "Approved", "Rejected"],
            required: true,
        },
        actorId: { type: Schema.Types.ObjectId, ref: "User" },
        actorName: { type: String, trim: true },
        actorRole: { type: String, trim: true },
        remarks: { type: String, trim: true },
        changedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const PbasApplicationSchema = new Schema<IPbasApplication>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        academicYear: { type: String, required: true, trim: true, index: true },
        currentDesignation: { type: String, required: true, trim: true },
        appraisalPeriod: {
            fromDate: { type: String, required: true, trim: true },
            toDate: { type: String, required: true, trim: true },
        },
        category1: {
            classesTaken: { type: Number, default: 0 },
            coursePreparationHours: { type: Number, default: 0 },
            coursesTaught: { type: [String], default: [] },
            mentoringCount: { type: Number, default: 0 },
            labSupervisionCount: { type: Number, default: 0 },
            feedbackSummary: { type: String, trim: true },
        },
        category2: {
            researchPapers: { type: [ResearchPaperSchema], default: [] },
            books: { type: [BookSchema], default: [] },
            patents: { type: [PatentSchema], default: [] },
            conferences: { type: [ConferenceSchema], default: [] },
            projects: { type: [ProjectSchema], default: [] },
        },
        category3: {
            committees: { type: [CommitteeSchema], default: [] },
            administrativeDuties: { type: [AdministrativeDutySchema], default: [] },
            examDuties: { type: [ExamDutySchema], default: [] },
            studentGuidance: { type: [StudentGuidanceSchema], default: [] },
            extensionActivities: { type: [ExtensionActivitySchema], default: [] },
        },
        apiScore: {
            teachingActivities: { type: Number, default: 0 },
            researchAcademicContribution: { type: Number, default: 0 },
            institutionalResponsibilities: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
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
        collection: "pbas_applications",
    }
);

PbasApplicationSchema.index({ facultyId: 1, academicYear: 1 });
PbasApplicationSchema.index({ facultyId: 1, status: 1, updatedAt: -1 });

const PbasApplication: Model<IPbasApplication> =
    mongoose.models.PbasApplication ||
    mongoose.model<IPbasApplication>("PbasApplication", PbasApplicationSchema);

export default PbasApplication;
