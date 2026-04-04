import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const waterManagementSystemTypeValues = [
    "RainwaterHarvesting",
    "Recycling",
    "Reuse",
    "TreatmentPlant",
    "Other",
] as const;

export const waterManagementSystemStatusValues = [
    "Active",
    "Planned",
    "Completed",
    "UnderMaintenance",
    "Inactive",
] as const;

export type WaterManagementSystemType =
    (typeof waterManagementSystemTypeValues)[number];
export type WaterManagementSystemStatus =
    (typeof waterManagementSystemStatusValues)[number];

export interface IWaterManagementSystem extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    systemType: WaterManagementSystemType;
    installationYear?: number;
    capacityLiters?: number;
    status: WaterManagementSystemStatus;
    methodology?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const WaterManagementSystemSchema = new Schema<IWaterManagementSystem>(
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
        systemType: {
            type: String,
            enum: waterManagementSystemTypeValues,
            required: true,
            default: "RainwaterHarvesting",
            index: true,
        },
        installationYear: { type: Number, min: 1900, max: 3000 },
        capacityLiters: { type: Number, min: 0 },
        status: {
            type: String,
            enum: waterManagementSystemStatusValues,
            required: true,
            default: "Active",
            index: true,
        },
        methodology: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "water_management_systems" }
);

WaterManagementSystemSchema.index({
    assignmentId: 1,
    displayOrder: 1,
    systemType: 1,
});

const WaterManagementSystem: Model<IWaterManagementSystem> =
    mongoose.models.WaterManagementSystem ||
    mongoose.model<IWaterManagementSystem>(
        "WaterManagementSystem",
        WaterManagementSystemSchema
    );

export default WaterManagementSystem;
