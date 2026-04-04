import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const sssQuestionAnalyticsBucketValues = [
    "TeachingLearning",
    "Infrastructure",
    "StudentSupport",
    "Governance",
    "General",
] as const;

export type SssQuestionAnalyticsBucket = (typeof sssQuestionAnalyticsBucketValues)[number];

export interface ISssQuestion extends Document {
    surveyId: Types.ObjectId;
    questionText: string;
    ratingScaleMax: number;
    displayOrder: number;
    isMandatory: boolean;
    analyticsBucket: SssQuestionAnalyticsBucket;
    createdAt: Date;
    updatedAt: Date;
}

const SssQuestionSchema = new Schema<ISssQuestion>(
    {
        surveyId: { type: Schema.Types.ObjectId, ref: "SssSurvey", required: true, index: true },
        questionText: { type: String, required: true, trim: true },
        ratingScaleMax: { type: Number, required: true, min: 2, default: 5 },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
        isMandatory: { type: Boolean, required: true, default: true },
        analyticsBucket: {
            type: String,
            enum: sssQuestionAnalyticsBucketValues,
            required: true,
            default: "General",
            index: true,
        },
    },
    { timestamps: true, collection: "sss_questions" }
);

SssQuestionSchema.index({ surveyId: 1, displayOrder: 1 }, { unique: true });

const SssQuestion: Model<ISssQuestion> =
    mongoose.models.SssQuestion || mongoose.model<ISssQuestion>("SssQuestion", SssQuestionSchema);

export default SssQuestion;
