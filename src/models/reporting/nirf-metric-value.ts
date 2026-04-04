import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface INirfMetricValue extends Document {
    rankingCycleId: Types.ObjectId;
    institutionId: Types.ObjectId;
    metricId: Types.ObjectId;
    metricValueNumeric?: number;
    metricValueText?: string;
    dataVerified: boolean;
    verifiedByUserId?: Types.ObjectId;
    verifiedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const NirfMetricValueSchema = new Schema<INirfMetricValue>(
    {
        rankingCycleId: { type: Schema.Types.ObjectId, ref: "NirfRankingCycle", required: true, index: true },
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
        metricId: { type: Schema.Types.ObjectId, ref: "NirfMetric", required: true, index: true },
        metricValueNumeric: { type: Number },
        metricValueText: { type: String, trim: true },
        dataVerified: { type: Boolean, required: true, default: false, index: true },
        verifiedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
        verifiedAt: { type: Date },
    },
    { timestamps: true, collection: "nirf_metric_values" }
);

NirfMetricValueSchema.index({ rankingCycleId: 1, institutionId: 1, metricId: 1 }, { unique: true });

const NirfMetricValue: Model<INirfMetricValue> =
    mongoose.models.NirfMetricValue ||
    mongoose.model<INirfMetricValue>("NirfMetricValue", NirfMetricValueSchema);

export default NirfMetricValue;
