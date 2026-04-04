import mongoose, { Document, Model, Schema, Types } from "mongoose";

import type { NaacMetricSourceMode, NaacMetricValueType } from "@/models/reporting/naac-metric-definition";

export type NaacMetricReviewStatus = "Pending" | "Generated" | "Reviewed" | "Overridden";
export type NaacMetricReviewAction = "Generated" | "Reviewed" | "Overridden";

export interface INaacMetricValueSourceSnapshot {
    sourceType: string;
    label: string;
    collectionName: string;
    count?: number;
    value?: string;
    recordIds: string[];
}

export interface INaacMetricValueReviewLog {
    action: NaacMetricReviewAction;
    actorId?: Types.ObjectId;
    actorName?: string;
    actorRole?: string;
    remarks?: string;
    previousValue?: string;
    nextValue?: string;
    actedAt: Date;
}

export interface INaacMetricValue extends Document {
    cycleId: Types.ObjectId;
    academicYearId?: Types.ObjectId;
    academicYearLabel: string;
    definitionId: Types.ObjectId;
    metricKey: string;
    metricCode: string;
    criteriaCode: string;
    criteriaName: string;
    label: string;
    sourceType: string;
    sourceLabel: string;
    sourceMode: NaacMetricSourceMode;
    moduleKey?: string;
    guidance?: string;
    tableName: string;
    fieldReference: string;
    valueType: NaacMetricValueType;
    weightage: number;
    numericValue?: number;
    textValue?: string;
    effectiveValueText?: string;
    status: NaacMetricReviewStatus;
    sourceSnapshots: INaacMetricValueSourceSnapshot[];
    lastGeneratedAt?: Date;
    reviewedAt?: Date;
    reviewedBy?: Types.ObjectId;
    reviewRemarks?: string;
    overriddenAt?: Date;
    overriddenBy?: Types.ObjectId;
    overrideNumericValue?: number;
    overrideTextValue?: string;
    overrideReason?: string;
    reviewHistory: INaacMetricValueReviewLog[];
    createdAt: Date;
    updatedAt: Date;
}

const NaacMetricValueSourceSnapshotSchema = new Schema<INaacMetricValueSourceSnapshot>(
    {
        sourceType: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        collectionName: { type: String, required: true, trim: true },
        count: { type: Number, min: 0 },
        value: { type: String, trim: true },
        recordIds: { type: [String], default: [] },
    },
    { _id: false }
);

const NaacMetricValueReviewLogSchema = new Schema<INaacMetricValueReviewLog>(
    {
        action: {
            type: String,
            enum: ["Generated", "Reviewed", "Overridden"],
            required: true,
        },
        actorId: { type: Schema.Types.ObjectId, ref: "User" },
        actorName: { type: String, trim: true },
        actorRole: { type: String, trim: true },
        remarks: { type: String, trim: true },
        previousValue: { type: String, trim: true },
        nextValue: { type: String, trim: true },
        actedAt: { type: Date, required: true },
    },
    { _id: false }
);

const NaacMetricValueSchema = new Schema<INaacMetricValue>(
    {
        cycleId: { type: Schema.Types.ObjectId, ref: "NaacMetricCycle", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", index: true },
        academicYearLabel: { type: String, required: true, trim: true, index: true },
        definitionId: { type: Schema.Types.ObjectId, ref: "NaacMetricDefinition", required: true, index: true },
        metricKey: { type: String, required: true, trim: true, index: true },
        metricCode: { type: String, required: true, trim: true, uppercase: true, index: true },
        criteriaCode: { type: String, required: true, trim: true, uppercase: true, index: true },
        criteriaName: { type: String, required: true, trim: true },
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
        tableName: { type: String, required: true, trim: true, index: true },
        fieldReference: { type: String, required: true, trim: true },
        valueType: {
            type: String,
            enum: ["count", "number", "text"],
            required: true,
            default: "count",
        },
        weightage: { type: Number, default: 0, min: 0 },
        numericValue: { type: Number },
        textValue: { type: String, trim: true },
        effectiveValueText: { type: String, trim: true },
        status: {
            type: String,
            enum: ["Pending", "Generated", "Reviewed", "Overridden"],
            required: true,
            default: "Pending",
            index: true,
        },
        sourceSnapshots: { type: [NaacMetricValueSourceSnapshotSchema], default: [] },
        lastGeneratedAt: { type: Date },
        reviewedAt: { type: Date },
        reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
        reviewRemarks: { type: String, trim: true },
        overriddenAt: { type: Date },
        overriddenBy: { type: Schema.Types.ObjectId, ref: "User" },
        overrideNumericValue: { type: Number },
        overrideTextValue: { type: String, trim: true },
        overrideReason: { type: String, trim: true },
        reviewHistory: { type: [NaacMetricValueReviewLogSchema], default: [] },
    },
    { timestamps: true, collection: "naac_metric_values" }
);

NaacMetricValueSchema.index({ cycleId: 1, metricKey: 1 }, { unique: true });
NaacMetricValueSchema.index({ cycleId: 1, criteriaCode: 1, updatedAt: -1 });

const NaacMetricValue: Model<INaacMetricValue> =
    mongoose.models.NaacMetricValue ||
    mongoose.model<INaacMetricValue>("NaacMetricValue", NaacMetricValueSchema);

export default NaacMetricValue;
