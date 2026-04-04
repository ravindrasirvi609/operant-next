import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const environmentalResourceCategoryValues = [
    "EnergyConsumption",
    "WaterManagement",
    "WasteManagement",
] as const;

export const environmentalResourceStatusValues = [
    "Active",
    "Planned",
    "Completed",
    "Continuous",
] as const;

export type EnvironmentalResourceCategory =
    (typeof environmentalResourceCategoryValues)[number];
export type EnvironmentalResourceStatus =
    (typeof environmentalResourceStatusValues)[number];

export interface IEnvironmentalResourceRecord extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    resourceCategory: EnvironmentalResourceCategory;
    resourceType?: string;
    recordedMonth?: string;
    unitsConsumed?: number;
    costIncurred?: number;
    installationYear?: number;
    capacityLiters?: number;
    methodology?: string;
    status: EnvironmentalResourceStatus;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const EnvironmentalResourceRecordSchema = new Schema<IEnvironmentalResourceRecord>(
    {
        planId: {
            type: Schema.Types.ObjectId,
            ref: "InstitutionalValuesBestPracticesPlan",
            required: true,
            index: true,
        },
        assignmentId: {
            type: Schema.Types.ObjectId,
            ref: "InstitutionalValuesBestPracticesAssignment",
            required: true,
            index: true,
        },
        resourceCategory: {
            type: String,
            enum: environmentalResourceCategoryValues,
            required: true,
            default: "EnergyConsumption",
            index: true,
        },
        resourceType: { type: String, trim: true },
        recordedMonth: { type: String, trim: true },
        unitsConsumed: { type: Number, min: 0 },
        costIncurred: { type: Number, min: 0 },
        installationYear: { type: Number, min: 1900, max: 3000 },
        capacityLiters: { type: Number, min: 0 },
        methodology: { type: String, trim: true },
        status: {
            type: String,
            enum: environmentalResourceStatusValues,
            required: true,
            default: "Active",
            index: true,
        },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "environmental_resource_records" }
);

EnvironmentalResourceRecordSchema.index({
    assignmentId: 1,
    displayOrder: 1,
    resourceCategory: 1,
    resourceType: 1,
});

const EnvironmentalResourceRecord: Model<IEnvironmentalResourceRecord> =
    mongoose.models.EnvironmentalResourceRecord ||
    mongoose.model<IEnvironmentalResourceRecord>(
        "EnvironmentalResourceRecord",
        EnvironmentalResourceRecordSchema
    );

export default EnvironmentalResourceRecord;
