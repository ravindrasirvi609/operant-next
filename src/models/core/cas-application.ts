import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CasStatus =
    | "Draft"
    | "Submitted"
    | "Under Review"
    | "Committee Review"
    | "Approved"
    | "Rejected";

export interface ICasPublication {
    title: string;
    journal: string;
    year: number;
    issn?: string;
    indexing?: string;
}

export interface ICasBook {
    title: string;
    publisher: string;
    isbn?: string;
    year: number;
}

export interface ICasResearchProject {
    title: string;
    fundingAgency: string;
    amount: number;
    year: number;
}

export interface ICasReviewCommitteeEntry {
    reviewerId: Types.ObjectId;
    reviewerName?: string;
    reviewerRole?: string;
    designation: string;
    remarks?: string;
    decision: string;
    stage: "Department Head" | "CAS Committee" | "Admin";
    reviewedAt: Date;
}

export interface ICasStatusLog {
    status: CasStatus;
    actorId?: Types.ObjectId;
    actorName?: string;
    actorRole?: string;
    remarks?: string;
    changedAt: Date;
}

export interface ICasApplication extends Document {
    facultyId: Types.ObjectId;
    applicationYear: string;
    currentDesignation: string;
    applyingForDesignation: string;
    eligibilityPeriod: {
        fromYear: number;
        toYear: number;
    };
    experienceYears: number;
    pbasReports: Types.ObjectId[];
    apiScore: {
        teachingLearning: number;
        researchPublication: number;
        academicContribution: number;
        totalScore: number;
    };
    achievements: {
        publications: ICasPublication[];
        books: ICasBook[];
        researchProjects: ICasResearchProject[];
        phdGuided: number;
        conferences: number;
    };
    eligibility: {
        isEligible: boolean;
        message?: string;
        minimumExperienceYears?: number;
        minimumApiScore?: number;
    };
    reviewCommittee: ICasReviewCommitteeEntry[];
    statusLogs: ICasStatusLog[];
    status: CasStatus;
    submittedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const CasPublicationSchema = new Schema<ICasPublication>(
    {
        title: { type: String, required: true, trim: true },
        journal: { type: String, required: true, trim: true },
        year: { type: Number, required: true },
        issn: { type: String, trim: true },
        indexing: { type: String, trim: true },
    },
    { _id: false }
);

const CasBookSchema = new Schema<ICasBook>(
    {
        title: { type: String, required: true, trim: true },
        publisher: { type: String, required: true, trim: true },
        isbn: { type: String, trim: true },
        year: { type: Number, required: true },
    },
    { _id: false }
);

const CasResearchProjectSchema = new Schema<ICasResearchProject>(
    {
        title: { type: String, required: true, trim: true },
        fundingAgency: { type: String, required: true, trim: true },
        amount: { type: Number, default: 0 },
        year: { type: Number, required: true },
    },
    { _id: false }
);

const CasReviewCommitteeSchema = new Schema<ICasReviewCommitteeEntry>(
    {
        reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        reviewerName: { type: String, trim: true },
        reviewerRole: { type: String, trim: true },
        designation: { type: String, required: true, trim: true },
        remarks: { type: String, trim: true },
        decision: { type: String, required: true, trim: true },
        stage: {
            type: String,
            enum: ["Department Head", "CAS Committee", "Admin"],
            required: true,
        },
        reviewedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const CasStatusLogSchema = new Schema<ICasStatusLog>(
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

const CasApplicationSchema = new Schema<ICasApplication>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        applicationYear: { type: String, required: true, trim: true, index: true },
        currentDesignation: { type: String, required: true, trim: true },
        applyingForDesignation: { type: String, required: true, trim: true },
        eligibilityPeriod: {
            fromYear: { type: Number, required: true },
            toYear: { type: Number, required: true },
        },
        experienceYears: { type: Number, required: true, default: 0 },
        pbasReports: [{ type: Schema.Types.ObjectId }],
        apiScore: {
            teachingLearning: { type: Number, default: 0 },
            researchPublication: { type: Number, default: 0 },
            academicContribution: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
        },
        achievements: {
            publications: { type: [CasPublicationSchema], default: [] },
            books: { type: [CasBookSchema], default: [] },
            researchProjects: { type: [CasResearchProjectSchema], default: [] },
            phdGuided: { type: Number, default: 0 },
            conferences: { type: Number, default: 0 },
        },
        eligibility: {
            isEligible: { type: Boolean, default: false },
            message: { type: String, trim: true },
            minimumExperienceYears: { type: Number },
            minimumApiScore: { type: Number },
        },
        reviewCommittee: { type: [CasReviewCommitteeSchema], default: [] },
        statusLogs: { type: [CasStatusLogSchema], default: [] },
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
        collection: "cas_applications",
    }
);

CasApplicationSchema.index({ facultyId: 1, applicationYear: 1 });
CasApplicationSchema.index({ facultyId: 1, status: 1, updatedAt: -1 });

const CasApplication: Model<ICasApplication> =
    mongoose.models.CasApplication ||
    mongoose.model<ICasApplication>("CasApplication", CasApplicationSchema);

export default CasApplication;
