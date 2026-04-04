import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface INirfMetricScore extends Document {
    rankingCycleId: Types.ObjectId;
    metricId: Types.ObjectId;
    scoreObtained: number;
    scoreNormalized: number;
    calculatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const NirfMetricScoreSchema = new Schema<INirfMetricScore>(
    {
        rankingCycleId: { type: Schema.Types.ObjectId, ref: "NirfRankingCycle", required: true, index: true },
        metricId: { type: Schema.Types.ObjectId, ref: "NirfMetric", required: true, index: true },
        scoreObtained: { type: Number, required: true, default: 0 },
        scoreNormalized: { type: Number, required: true, default: 0 },
        calculatedAt: { type: Date, required: true, default: Date.now },
    },
    { timestamps: true, collection: "nirf_metric_scores" }
);

NirfMetricScoreSchema.index({ rankingCycleId: 1, metricId: 1 }, { unique: true });

const NirfMetricScore: Model<INirfMetricScore> =
    mongoose.models.NirfMetricScore ||
    mongoose.model<INirfMetricScore>("NirfMetricScore", NirfMetricScoreSchema);

export default NirfMetricScore;
