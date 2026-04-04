import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const nirfSubmissionStatusValues = ["Prepared", "Submitted", "Accepted", "Rejected"] as const;

export interface INirfSubmissionLog extends Document {
    rankingCycleId: Types.ObjectId;
    submittedByUserId?: Types.ObjectId;
    submissionReferenceNo?: string;
    submissionDate?: Date;
    submissionStatus: (typeof nirfSubmissionStatusValues)[number];
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const NirfSubmissionLogSchema = new Schema<INirfSubmissionLog>(
    {
        rankingCycleId: { type: Schema.Types.ObjectId, ref: "NirfRankingCycle", required: true, index: true },
        submittedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
        submissionReferenceNo: { type: String, trim: true },
        submissionDate: { type: Date },
        submissionStatus: {
            type: String,
            enum: nirfSubmissionStatusValues,
            required: true,
            default: "Prepared",
            index: true,
        },
        remarks: { type: String, trim: true },
    },
    { timestamps: true, collection: "nirf_submission_logs" }
);

const NirfSubmissionLog: Model<INirfSubmissionLog> =
    mongoose.models.NirfSubmissionLog ||
    mongoose.model<INirfSubmissionLog>("NirfSubmissionLog", NirfSubmissionLogSchema);

export default NirfSubmissionLog;
