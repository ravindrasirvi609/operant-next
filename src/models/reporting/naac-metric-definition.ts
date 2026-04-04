import mongoose, { Document, Model, Schema } from "mongoose";

export type NaacMetricValueType = "count" | "number" | "text";
export type NaacMetricSourceMode = "AUTO" | "MANUAL";

export interface INaacMetricDefinition extends Document {
    metricKey: string;
    metricCode: string;
    criteriaCode: string;
    criteriaName: string;
    tableName: string;
    fieldReference: string;
    label: string;
    sourceType: string;
    sourceLabel: string;
    sourceMode: NaacMetricSourceMode;
    moduleKey?: string;
    guidance?: string;
    valueType: NaacMetricValueType;
    defaultWeightage: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const NaacMetricDefinitionSchema = new Schema<INaacMetricDefinition>(
    {
        metricKey: { type: String, required: true, trim: true, unique: true, index: true },
        metricCode: { type: String, required: true, trim: true, uppercase: true, index: true },
        criteriaCode: { type: String, required: true, trim: true, uppercase: true, index: true },
        criteriaName: { type: String, required: true, trim: true },
        tableName: { type: String, required: true, trim: true, index: true },
        fieldReference: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        sourceType: { type: String, required: true, trim: true },
        sourceLabel: { type: String, required: true, trim: true },
        sourceMode: {
            type: String,
            enum: ["AUTO", "MANUAL"],
            required: true,
            default: "AUTO",
            index: true,
        },
        moduleKey: { type: String, trim: true, index: true },
        guidance: { type: String, trim: true },
        valueType: {
            type: String,
            enum: ["count", "number", "text"],
            required: true,
            default: "count",
        },
        defaultWeightage: { type: Number, required: true, default: 0, min: 0 },
        isActive: { type: Boolean, required: true, default: true, index: true },
    },
    { timestamps: true, collection: "naac_metric_definitions" }
);

NaacMetricDefinitionSchema.index({ criteriaCode: 1, isActive: 1, label: 1 });
NaacMetricDefinitionSchema.index({ tableName: 1, fieldReference: 1 }, { unique: true });

const NaacMetricDefinition: Model<INaacMetricDefinition> =
    mongoose.models.NaacMetricDefinition ||
    mongoose.model<INaacMetricDefinition>("NaacMetricDefinition", NaacMetricDefinitionSchema);

export default NaacMetricDefinition;
