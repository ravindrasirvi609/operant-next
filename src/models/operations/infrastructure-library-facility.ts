import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const infrastructureFacilityTypeValues = [
    "Classroom",
    "ICTClassroom",
    "Laboratory",
    "ResearchFacility",
    "SeminarHall",
    "ComputerCenter",
    "LibrarySpace",
    "Hostel",
    "SportsFacility",
    "CommonFacility",
    "Other",
] as const;

export const infrastructureFacilityStatusValues = [
    "Available",
    "UnderMaintenance",
    "Planned",
    "Shared",
] as const;

export type InfrastructureFacilityType =
    (typeof infrastructureFacilityTypeValues)[number];
export type InfrastructureFacilityStatus =
    (typeof infrastructureFacilityStatusValues)[number];

export interface IInfrastructureLibraryFacility extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    facilityType: InfrastructureFacilityType;
    name: string;
    identifier?: string;
    buildingName?: string;
    quantity?: number;
    capacity?: number;
    areaSqFt?: number;
    ictEnabled: boolean;
    status: InfrastructureFacilityStatus;
    utilizationPercent?: number;
    remarks?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const InfrastructureLibraryFacilitySchema =
    new Schema<IInfrastructureLibraryFacility>(
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
            facilityType: {
                type: String,
                enum: infrastructureFacilityTypeValues,
                required: true,
                default: "Classroom",
                index: true,
            },
            name: { type: String, required: true, trim: true },
            identifier: { type: String, trim: true },
            buildingName: { type: String, trim: true },
            quantity: { type: Number, min: 0 },
            capacity: { type: Number, min: 0 },
            areaSqFt: { type: Number, min: 0 },
            ictEnabled: { type: Boolean, default: false },
            status: {
                type: String,
                enum: infrastructureFacilityStatusValues,
                required: true,
                default: "Available",
                index: true,
            },
            utilizationPercent: { type: Number, min: 0, max: 100 },
            remarks: { type: String, trim: true },
            documentId: { type: Schema.Types.ObjectId, ref: "Document" },
            displayOrder: { type: Number, required: true, min: 1, default: 1 },
        },
        { timestamps: true, collection: "infrastructure_library_facilities" }
    );

InfrastructureLibraryFacilitySchema.index(
    { assignmentId: 1, displayOrder: 1, facilityType: 1, name: 1 }
);

const InfrastructureLibraryFacility: Model<IInfrastructureLibraryFacility> =
    mongoose.models.InfrastructureLibraryFacility ||
    mongoose.model<IInfrastructureLibraryFacility>(
        "InfrastructureLibraryFacility",
        InfrastructureLibraryFacilitySchema
    );

export default InfrastructureLibraryFacility;
