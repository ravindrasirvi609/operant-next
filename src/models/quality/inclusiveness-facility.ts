import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const inclusivenessFacilityTypeValues = [
    "Ramp",
    "Lift",
    "BrailleSignage",
    "ScribeSupport",
    "AccessibleWashroom",
    "Other",
] as const;

export const inclusivenessFacilityStatusValues = [
    "Active",
    "Planned",
    "UnderMaintenance",
    "Inactive",
] as const;

export type InclusivenessFacilityType = (typeof inclusivenessFacilityTypeValues)[number];
export type InclusivenessFacilityStatus = (typeof inclusivenessFacilityStatusValues)[number];

export interface IInclusivenessFacility extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    facilityType: InclusivenessFacilityType;
    locationDescription?: string;
    establishedYear?: number;
    status: InclusivenessFacilityStatus;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const InclusivenessFacilitySchema = new Schema<IInclusivenessFacility>(
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
        facilityType: {
            type: String,
            enum: inclusivenessFacilityTypeValues,
            required: true,
            default: "Ramp",
            index: true,
        },
        locationDescription: { type: String, trim: true },
        establishedYear: { type: Number, min: 1900, max: 3000 },
        status: {
            type: String,
            enum: inclusivenessFacilityStatusValues,
            required: true,
            default: "Active",
            index: true,
        },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "inclusiveness_facilities" }
);

InclusivenessFacilitySchema.index({
    assignmentId: 1,
    displayOrder: 1,
    facilityType: 1,
});

const InclusivenessFacility: Model<IInclusivenessFacility> =
    mongoose.models.InclusivenessFacility ||
    mongoose.model<IInclusivenessFacility>("InclusivenessFacility", InclusivenessFacilitySchema);

export default InclusivenessFacility;
