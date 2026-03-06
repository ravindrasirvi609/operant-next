import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISoftEquipment extends Document {
    outcome: string;
    status: string;
    proof?: string;
    proof2?: string;
    type: string;
    subType: string;
    event?: string;
    activity?: string;
    centerName?: string;
    coordinator?: string;
    noOfStudentBeneficiary?: number;
    noOfFacultyBeneficiary?: number;
    objective?: string;
    fromDate?: string;
    toDate?: string;
    durationInDays?: number;
    elementId: number;
    createdAt: Date;
    updatedAt: Date;
}

const SoftEquipmentSchema = new Schema<ISoftEquipment>(
    {
        outcome: {
            type: String,
            required: [true, "Outcome is required"],
        },
        status: {
            type: String,
            required: [true, "Status is required"],
        },
        proof: {
            type: String,
        },
        proof2: {
            type: String,
        },
        type: {
            type: String,
            required: [true, "Type is required"],
        },
        subType: {
            type: String,
            required: [true, "Sub-type is required"],
        },
        event: {
            type: String,
        },
        activity: {
            type: String,
        },
        centerName: {
            type: String,
        },
        coordinator: {
            type: String,
        },
        noOfStudentBeneficiary: {
            type: Number,
        },
        noOfFacultyBeneficiary: {
            type: Number,
        },
        objective: {
            type: String,
        },
        fromDate: {
            type: String,
        },
        toDate: {
            type: String,
        },
        durationInDays: {
            type: Number,
        },
        elementId: {
            type: Number,
            required: [true, "Element ID is required"],
        },
    },
    {
        timestamps: true,
        collection: "softandequipments",
    }
);

const SoftEquipment: Model<ISoftEquipment> =
    mongoose.models.SoftEquipment ||
    mongoose.model<ISoftEquipment>("SoftEquipment", SoftEquipmentSchema);

export default SoftEquipment;
