import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const ssrMetricTypeValues = ["Quantitative", "Qualitative"] as const;
export const ssrMetricDataTypeValues = [
    "Narrative",
    "Number",
    "Percentage",
    "Currency",
    "Boolean",
    "Date",
    "Text",
    "Json",
] as const;
export const ssrOwnershipScopeValues = [
    "Institution",
    "Department",
    "Program",
    "Office",
    "Faculty",
    "Student",
    "Shared",
] as const;
export const ssrEvidenceModeValues = ["Required", "Optional", "NotApplicable"] as const;
export const ssrContributorRoleValues = [
    "Faculty",
    "Student",
    "Alumni",
    "Admin",
    "Director",
    "PRO",
    "NSS",
    "Sports",
    "Swayam",
    "Placement",
] as const;

export type SsrMetricType = (typeof ssrMetricTypeValues)[number];
export type SsrMetricDataType = (typeof ssrMetricDataTypeValues)[number];
export type SsrOwnershipScope = (typeof ssrOwnershipScopeValues)[number];
export type SsrEvidenceMode = (typeof ssrEvidenceModeValues)[number];
export type SsrContributorRole = (typeof ssrContributorRoleValues)[number];

export interface ISsrMetric extends Document {
    cycleId: Types.ObjectId;
    criterionId: Types.ObjectId;
    metricCode: string;
    title: string;
    description?: string;
    instructions?: string;
    metricType: SsrMetricType;
    dataType: SsrMetricDataType;
    ownershipScope: SsrOwnershipScope;
    sourceModule?: string;
    benchmarkValue?: string;
    unitLabel?: string;
    evidenceMode: SsrEvidenceMode;
    allowedContributorRoles: SsrContributorRole[];
    displayOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SsrMetricSchema = new Schema<ISsrMetric>(
    {
        cycleId: { type: Schema.Types.ObjectId, ref: "SsrCycle", required: true, index: true },
        criterionId: { type: Schema.Types.ObjectId, ref: "SsrCriterion", required: true, index: true },
        metricCode: { type: String, required: true, trim: true, uppercase: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        instructions: { type: String, trim: true },
        metricType: { type: String, enum: ssrMetricTypeValues, required: true, default: "Quantitative" },
        dataType: { type: String, enum: ssrMetricDataTypeValues, required: true, default: "Narrative" },
        ownershipScope: {
            type: String,
            enum: ssrOwnershipScopeValues,
            required: true,
            default: "Department",
        },
        sourceModule: { type: String, trim: true },
        benchmarkValue: { type: String, trim: true },
        unitLabel: { type: String, trim: true },
        evidenceMode: {
            type: String,
            enum: ssrEvidenceModeValues,
            required: true,
            default: "Optional",
        },
        allowedContributorRoles: {
            type: [{ type: String, enum: ssrContributorRoleValues }],
            default: ["Faculty"],
            required: true,
        },
        displayOrder: { type: Number, required: true, default: 1 },
        isActive: { type: Boolean, required: true, default: true, index: true },
    },
    { timestamps: true, collection: "ssr_metrics" }
);

SsrMetricSchema.index({ cycleId: 1, metricCode: 1 }, { unique: true });
SsrMetricSchema.index({ criterionId: 1, displayOrder: 1 });

const SsrMetric: Model<ISsrMetric> =
    mongoose.models.SsrMetric ||
    mongoose.model<ISsrMetric>("SsrMetric", SsrMetricSchema);

export default SsrMetric;
