import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ISssResultAnalytics extends Document {
    surveyId: Types.ObjectId;
    overallSatisfactionIndex: number;
    teachingLearningScore: number;
    infrastructureScore: number;
    studentSupportScore: number;
    governanceScore: number;
    submittedResponses: number;
    eligibleResponses: number;
    responseRate: number;
    generatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const SssResultAnalyticsSchema = new Schema<ISssResultAnalytics>(
    {
        surveyId: { type: Schema.Types.ObjectId, ref: "SssSurvey", required: true, unique: true, index: true },
        overallSatisfactionIndex: { type: Number, required: true, default: 0, min: 0 },
        teachingLearningScore: { type: Number, required: true, default: 0, min: 0 },
        infrastructureScore: { type: Number, required: true, default: 0, min: 0 },
        studentSupportScore: { type: Number, required: true, default: 0, min: 0 },
        governanceScore: { type: Number, required: true, default: 0, min: 0 },
        submittedResponses: { type: Number, required: true, default: 0, min: 0 },
        eligibleResponses: { type: Number, required: true, default: 0, min: 0 },
        responseRate: { type: Number, required: true, default: 0, min: 0 },
        generatedAt: { type: Date, required: true, default: Date.now },
    },
    { timestamps: true, collection: "sss_result_analytics" }
);

const SssResultAnalytics: Model<ISssResultAnalytics> =
    mongoose.models.SssResultAnalytics ||
    mongoose.model<ISssResultAnalytics>("SssResultAnalytics", SssResultAnalyticsSchema);

export default SssResultAnalytics;
