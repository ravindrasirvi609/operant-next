import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface INirfCompositeScore extends Document {
    rankingCycleId: Types.ObjectId;
    institutionId: Types.ObjectId;
    totalScore: number;
    predictedRank?: number;
    confidenceIndex?: number;
    scoreCalculatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const NirfCompositeScoreSchema = new Schema<INirfCompositeScore>(
    {
        rankingCycleId: { type: Schema.Types.ObjectId, ref: "NirfRankingCycle", required: true, index: true },
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
        totalScore: { type: Number, required: true, default: 0 },
        predictedRank: { type: Number, min: 0 },
        confidenceIndex: { type: Number, min: 0, max: 100 },
        scoreCalculatedAt: { type: Date, required: true, default: Date.now },
    },
    { timestamps: true, collection: "nirf_composite_scores" }
);

NirfCompositeScoreSchema.index({ rankingCycleId: 1, institutionId: 1 }, { unique: true });

const NirfCompositeScore: Model<INirfCompositeScore> =
    mongoose.models.NirfCompositeScore ||
    mongoose.model<INirfCompositeScore>("NirfCompositeScore", NirfCompositeScoreSchema);

export default NirfCompositeScore;
