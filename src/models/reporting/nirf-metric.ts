import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface INirfMetric extends Document {
    rankingCycleId: Types.ObjectId;
    parameterId: Types.ObjectId;
    metricCode: string;
    metricName: string;
    maxScore: number;
    dataSourceModule?: string;
    calculationFormulaReference?: string;
    createdAt: Date;
    updatedAt: Date;
}

const NirfMetricSchema = new Schema<INirfMetric>(
    {
        rankingCycleId: { type: Schema.Types.ObjectId, ref: "NirfRankingCycle", required: true, index: true },
        parameterId: { type: Schema.Types.ObjectId, ref: "NirfParameter", required: true, index: true },
        metricCode: { type: String, required: true, trim: true, uppercase: true, index: true },
        metricName: { type: String, required: true, trim: true },
        maxScore: { type: Number, required: true, min: 0, default: 0 },
        dataSourceModule: { type: String, trim: true },
        calculationFormulaReference: { type: String, trim: true },
    },
    { timestamps: true, collection: "nirf_metrics" }
);

NirfMetricSchema.index({ rankingCycleId: 1, metricCode: 1 }, { unique: true });

const NirfMetric: Model<INirfMetric> =
    mongoose.models.NirfMetric || mongoose.model<INirfMetric>("NirfMetric", NirfMetricSchema);

export default NirfMetric;
