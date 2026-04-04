import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ISssResponse extends Document {
    surveyId: Types.ObjectId;
    anonymousToken: string;
    submittedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const SssResponseSchema = new Schema<ISssResponse>(
    {
        surveyId: { type: Schema.Types.ObjectId, ref: "SssSurvey", required: true, index: true },
        anonymousToken: { type: String, required: true, trim: true, unique: true, index: true },
        submittedAt: { type: Date, required: true, default: Date.now, index: true },
    },
    { timestamps: true, collection: "sss_responses" }
);

SssResponseSchema.index({ surveyId: 1, submittedAt: -1 });

const SssResponse: Model<ISssResponse> =
    mongoose.models.SssResponse || mongoose.model<ISssResponse>("SssResponse", SssResponseSchema);

export default SssResponse;
