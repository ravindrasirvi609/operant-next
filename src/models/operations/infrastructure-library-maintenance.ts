import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const infrastructureLibraryMaintenanceAssetCategoryValues = [
    "Facility",
    "Library",
    "ICT",
    "Equipment",
    "Civil",
    "Electrical",
    "Safety",
    "Other",
] as const;

export const infrastructureLibraryMaintenanceTypeValues = [
    "Preventive",
    "Corrective",
    "AMC",
    "Calibration",
    "Upgrade",
    "Renovation",
    "Inspection",
] as const;

export const infrastructureLibraryMaintenanceStatusValues = [
    "Scheduled",
    "Ongoing",
    "Completed",
    "Deferred",
] as const;

export type InfrastructureLibraryMaintenanceAssetCategory =
    (typeof infrastructureLibraryMaintenanceAssetCategoryValues)[number];
export type InfrastructureLibraryMaintenanceType =
    (typeof infrastructureLibraryMaintenanceTypeValues)[number];
export type InfrastructureLibraryMaintenanceStatus =
    (typeof infrastructureLibraryMaintenanceStatusValues)[number];

export interface IInfrastructureLibraryMaintenance extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    assetCategory: InfrastructureLibraryMaintenanceAssetCategory;
    assetName: string;
    maintenanceType: InfrastructureLibraryMaintenanceType;
    vendorName?: string;
    serviceDate?: Date;
    nextDueDate?: Date;
    status: InfrastructureLibraryMaintenanceStatus;
    costAmount?: number;
    remarks?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const InfrastructureLibraryMaintenanceSchema =
    new Schema<IInfrastructureLibraryMaintenance>(
        {
            planId: {
                type: Schema.Types.ObjectId,
                ref: "InfrastructureLibraryPlan",
                required: true,
                index: true,
            },
            assignmentId: {
                type: Schema.Types.ObjectId,
                ref: "InfrastructureLibraryAssignment",
                required: true,
                index: true,
            },
            assetCategory: {
                type: String,
                enum: infrastructureLibraryMaintenanceAssetCategoryValues,
                required: true,
                default: "Facility",
                index: true,
            },
            assetName: { type: String, required: true, trim: true },
            maintenanceType: {
                type: String,
                enum: infrastructureLibraryMaintenanceTypeValues,
                required: true,
                default: "Preventive",
                index: true,
            },
            vendorName: { type: String, trim: true },
            serviceDate: { type: Date },
            nextDueDate: { type: Date },
            status: {
                type: String,
                enum: infrastructureLibraryMaintenanceStatusValues,
                required: true,
                default: "Scheduled",
                index: true,
            },
            costAmount: { type: Number, min: 0 },
            remarks: { type: String, trim: true },
            documentId: { type: Schema.Types.ObjectId, ref: "Document" },
            displayOrder: { type: Number, required: true, min: 1, default: 1 },
        },
        { timestamps: true, collection: "infrastructure_library_maintenance" }
    );

InfrastructureLibraryMaintenanceSchema.index(
    { assignmentId: 1, displayOrder: 1, assetCategory: 1, assetName: 1 }
);

const InfrastructureLibraryMaintenance: Model<IInfrastructureLibraryMaintenance> =
    mongoose.models.InfrastructureLibraryMaintenance ||
    mongoose.model<IInfrastructureLibraryMaintenance>(
        "InfrastructureLibraryMaintenance",
        InfrastructureLibraryMaintenanceSchema
    );

export default InfrastructureLibraryMaintenance;
