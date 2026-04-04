import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const aisheSubmissionLogStatusValues = ["Prepared", "Submitted", "Accepted", "Rejected"] as const;

export interface IAisheSubmissionLog extends Document {
    surveyCycleId: Types.ObjectId;
    submittedByUserId?: Types.ObjectId;
    submissionDate?: Date;
    submissionReferenceNo?: string;
    submissionStatus: (typeof aisheSubmissionLogStatusValues)[number];
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const AisheSubmissionLogSchema = new Schema<IAisheSubmissionLog>(
    {
        surveyCycleId: { type: Schema.Types.ObjectId, ref: "AisheSurveyCycle", required: true, index: true },
        submittedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
        submissionDate: { type: Date },
        submissionReferenceNo: { type: String, trim: true },
        submissionStatus: {
            type: String,
            enum: aisheSubmissionLogStatusValues,
            required: true,
            default: "Prepared",
            index: true,
        },
        remarks: { type: String, trim: true },
    },
    { timestamps: true, collection: "aishe_submission_logs" }
);

const AisheSubmissionLog: Model<IAisheSubmissionLog> =
    mongoose.models.AisheSubmissionLog ||
    mongoose.model<IAisheSubmissionLog>("AisheSubmissionLog", AisheSubmissionLogSchema);

export default AisheSubmissionLog;
