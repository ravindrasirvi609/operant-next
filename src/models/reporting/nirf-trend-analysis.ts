import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const nirfTrendDirectionValues = ["Up", "Down", "Stable"] as const;

export interface INirfTrendAnalysis extends Document {
    institutionId: Types.ObjectId;
    rankingYear: number;
    frameworkType: string;
    overallRank?: number;
    overallScore: number;
    trendDirection: (typeof nirfTrendDirectionValues)[number];
    createdAt: Date;
    updatedAt: Date;
}

const NirfTrendAnalysisSchema = new Schema<INirfTrendAnalysis>(
    {
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
        rankingYear: { type: Number, required: true, min: 2000, index: true },
        frameworkType: { type: String, required: true, trim: true, index: true },
        overallRank: { type: Number, min: 0 },
        overallScore: { type: Number, required: true, default: 0 },
        trendDirection: {
            type: String,
            enum: nirfTrendDirectionValues,
            required: true,
            default: "Stable",
        },
    },
    { timestamps: true, collection: "nirf_trend_analysis" }
);

NirfTrendAnalysisSchema.index({ institutionId: 1, rankingYear: 1, frameworkType: 1 }, { unique: true });

const NirfTrendAnalysis: Model<INirfTrendAnalysis> =
    mongoose.models.NirfTrendAnalysis ||
    mongoose.model<INirfTrendAnalysis>("NirfTrendAnalysis", NirfTrendAnalysisSchema);

export default NirfTrendAnalysis;
