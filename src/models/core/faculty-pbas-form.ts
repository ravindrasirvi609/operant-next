import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type FacultyPbasSubmissionStatus = "Draft" | "Submitted" | "Locked";

export type PbasStatus =
    | "Draft"
    | "Submitted"
    | "Under Review"
    | "Committee Review"
    | "Approved"
    | "Rejected";

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

export interface IFacultyPbasForm extends Document {
    facultyId: Types.ObjectId;
    academicYearId: Types.ObjectId;
    submissionStatus: FacultyPbasSubmissionStatus;
    submittedAt?: Date;
    verifiedBy?: Types.ObjectId;
    verifiedAt?: Date;
    remarks?: string;
    academicYear: string;
    currentDesignation: string;
    appraisalPeriod: { fromDate: string; toDate: string };
    apiScore: {
        teachingActivities: number;
        researchAcademicContribution: number;
        institutionalResponsibilities: number;
        totalScore: number;
    };
    reviewCommittee: IPbasReviewCommitteeEntry[];
    statusLogs: IPbasStatusLog[];
    status: PbasStatus;
    createdAt: Date;
    updatedAt: Date;
}

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

const FacultyPbasFormSchema = new Schema<IFacultyPbasForm>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
        submissionStatus: {
            type: String,
            enum: ["Draft", "Submitted", "Locked"],
            default: "Draft",
            required: true,
            index: true,
        },
        submittedAt: { type: Date },
        verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
        verifiedAt: { type: Date },
        remarks: { type: String, trim: true },
        academicYear: { type: String, required: true, trim: true, index: true },
        currentDesignation: { type: String, required: true, trim: true },
        appraisalPeriod: {
            fromDate: { type: String, required: true, trim: true },
            toDate: { type: String, required: true, trim: true },
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
    },
    { timestamps: true, collection: "faculty_pbas_forms" }
);

FacultyPbasFormSchema.index({ facultyId: 1, academicYearId: 1 }, { unique: true });
FacultyPbasFormSchema.index({ facultyId: 1, submissionStatus: 1, updatedAt: -1 });

const FacultyPbasForm: Model<IFacultyPbasForm> =
    mongoose.models.FacultyPbasForm ||
    mongoose.model<IFacultyPbasForm>("FacultyPbasForm", FacultyPbasFormSchema);

export default FacultyPbasForm;
