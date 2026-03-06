import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMaintenanceInfrastructure extends Document {
    academicYear: string;
    governmentAgencyName: string;
    nonGovernmentAgencyName: string;
    grantPurpose: string;
    fundsReceived: number;
    proof?: string;
    createdAt: Date;
    updatedAt: Date;
}

const MaintenanceInfrastructureSchema = new Schema<IMaintenanceInfrastructure>(
    {
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        governmentAgencyName: {
            type: String,
            required: [true, "Government agency name is required"],
            trim: true,
        },
        nonGovernmentAgencyName: {
            type: String,
            required: [true, "Non-government agency name is required"],
            trim: true,
        },
        grantPurpose: {
            type: String,
            required: [true, "Grant purpose is required"],
        },
        fundsReceived: {
            type: Number,
            required: [true, "Funds received is required"],
        },
        proof: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "maintenanceandinfrastructures",
    }
);

const MaintenanceInfrastructure: Model<IMaintenanceInfrastructure> =
    mongoose.models.MaintenanceInfrastructure ||
    mongoose.model<IMaintenanceInfrastructure>(
        "MaintenanceInfrastructure",
        MaintenanceInfrastructureSchema
    );

export default MaintenanceInfrastructure;
