import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type AqarCycleStatus =
    | "Draft"
    | "Department Review"
    | "IQAC Review"
    | "Finalized"
    | "Submitted";

export interface IAqarCycleSourceSnapshot {
    sourceType: string;
    label: string;
    count?: number;
    value?: string;
}

export interface IAqarCycleCriterion {
    criterionCode: "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7";
    title: string;
    summary: string;
    narrative?: string;
    metrics: Record<string, number | string>;
    completionPercent: number;
    status: "Pending" | "Ready" | "Reviewed";
    sourceSnapshots: IAqarCycleSourceSnapshot[];
}

export interface IAqarCycleStatusLog {
    action: string;
    actorId?: Types.ObjectId;
    actorName?: string;
    actorRole?: string;
    remarks?: string;
    changedAt: Date;
}

export interface IAqarCycle extends Document {
    academicYear: string;
    reportingPeriod: {
        fromDate: string;
        toDate: string;
    };
    institutionProfile: {
        universityName?: string;
        collegeName?: string;
        totalFaculty: number;
        totalStudents: number;
        totalDepartments: number;
        totalPrograms: number;
    };
    summaryMetrics: {
        approvedPbasReports: number;
        casApplications: number;
        facultyAqarContributions: number;
        placements: number;
        publications: number;
        projects: number;
    };
    criteriaSections: IAqarCycleCriterion[];
    status: AqarCycleStatus;
    preparedById?: Types.ObjectId;
    preparedByName?: string;
    finalizedAt?: Date;
    submittedAt?: Date;
    statusLogs: IAqarCycleStatusLog[];
    createdAt: Date;
    updatedAt: Date;
}

const SourceSnapshotSchema = new Schema<IAqarCycleSourceSnapshot>(
    {
        sourceType: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        count: { type: Number },
        value: { type: String, trim: true },
    },
    { _id: false }
);

const CriterionSchema = new Schema<IAqarCycleCriterion>(
    {
        criterionCode: {
            type: String,
            enum: ["C1", "C2", "C3", "C4", "C5", "C6", "C7"],
            required: true,
        },
        title: { type: String, required: true, trim: true },
        summary: { type: String, required: true, trim: true },
        narrative: { type: String, trim: true },
        metrics: { type: Schema.Types.Mixed, default: {} },
        completionPercent: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ["Pending", "Ready", "Reviewed"],
            default: "Pending",
        },
        sourceSnapshots: { type: [SourceSnapshotSchema], default: [] },
    },
    { _id: false }
);

const StatusLogSchema = new Schema<IAqarCycleStatusLog>(
    {
        action: { type: String, required: true, trim: true },
        actorId: { type: Schema.Types.ObjectId, ref: "User" },
        actorName: { type: String, trim: true },
        actorRole: { type: String, trim: true },
        remarks: { type: String, trim: true },
        changedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const AqarCycleSchema = new Schema<IAqarCycle>(
    {
        academicYear: { type: String, required: true, trim: true, unique: true, index: true },
        reportingPeriod: {
            fromDate: { type: String, required: true, trim: true },
            toDate: { type: String, required: true, trim: true },
        },
        institutionProfile: {
            universityName: { type: String, trim: true },
            collegeName: { type: String, trim: true },
            totalFaculty: { type: Number, default: 0 },
            totalStudents: { type: Number, default: 0 },
            totalDepartments: { type: Number, default: 0 },
            totalPrograms: { type: Number, default: 0 },
        },
        summaryMetrics: {
            approvedPbasReports: { type: Number, default: 0 },
            casApplications: { type: Number, default: 0 },
            facultyAqarContributions: { type: Number, default: 0 },
            placements: { type: Number, default: 0 },
            publications: { type: Number, default: 0 },
            projects: { type: Number, default: 0 },
        },
        criteriaSections: { type: [CriterionSchema], default: [] },
        status: {
            type: String,
            enum: ["Draft", "Department Review", "IQAC Review", "Finalized", "Submitted"],
            default: "Draft",
            index: true,
        },
        preparedById: { type: Schema.Types.ObjectId, ref: "User" },
        preparedByName: { type: String, trim: true },
        finalizedAt: { type: Date },
        submittedAt: { type: Date },
        statusLogs: { type: [StatusLogSchema], default: [] },
    },
    {
        timestamps: true,
        collection: "aqar_cycles",
    }
);

const AqarCycle: Model<IAqarCycle> =
    mongoose.models.AqarCycle || mongoose.model<IAqarCycle>("AqarCycle", AqarCycleSchema);

export default AqarCycle;
