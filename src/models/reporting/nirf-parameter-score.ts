import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface INirfParameterScore extends Document {
    rankingCycleId: Types.ObjectId;
    parameterId: Types.ObjectId;
    rawScore: number;
    weightedScore: number;
    calculatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const NirfParameterScoreSchema = new Schema<INirfParameterScore>(
    {
        rankingCycleId: { type: Schema.Types.ObjectId, ref: "NirfRankingCycle", required: true, index: true },
        parameterId: { type: Schema.Types.ObjectId, ref: "NirfParameter", required: true, index: true },
        rawScore: { type: Number, required: true, default: 0 },
        weightedScore: { type: Number, required: true, default: 0 },
        calculatedAt: { type: Date, required: true, default: Date.now },
    },
    { timestamps: true, collection: "nirf_parameter_scores" }
);

NirfParameterScoreSchema.index({ rankingCycleId: 1, parameterId: 1 }, { unique: true });

const NirfParameterScore: Model<INirfParameterScore> =
    mongoose.models.NirfParameterScore ||
    mongoose.model<INirfParameterScore>("NirfParameterScore", NirfParameterScoreSchema);

export default NirfParameterScore;
