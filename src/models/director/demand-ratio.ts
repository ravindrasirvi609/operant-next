import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDemandRatio extends Document {
    programCode: string;
    programName: string;
    academicYear?: string;
    numberOfSeatsAvailable: number;
    numberOfEligibleApplications: number;
    numberOfStudentsAdmitted: number;
    typeOfProgram?: string;
    otherUser?: string;
    uploadProof?: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const DemandRatioSchema = new Schema<IDemandRatio>(
    {
        programCode: {
            type: String,
            required: [true, "Program code is required"],
            trim: true,
            uppercase: true,
        },
        programName: {
            type: String,
            required: [true, "Program name is required"],
            trim: true,
        },
        academicYear: {
            type: String,
            index: true,
        },
        numberOfSeatsAvailable: {
            type: Number,
            required: [true, "Seats available is required"],
            min: [0, "Cannot be negative"],
        },
        numberOfEligibleApplications: {
            type: Number,
            required: [true, "Eligible applications is required"],
            min: [0, "Cannot be negative"],
        },
        numberOfStudentsAdmitted: {
            type: Number,
            required: [true, "Students admitted is required"],
            min: [0, "Cannot be negative"],
        },
        typeOfProgram: {
            type: String,
            trim: true,
        },
        otherUser: {
            type: String,
            trim: true,
        },
        uploadProof: {
            type: String,
        },
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "demandratios",
    }
);

const DemandRatio: Model<IDemandRatio> =
    mongoose.models.DemandRatio ||
    mongoose.model<IDemandRatio>("DemandRatio", DemandRatioSchema);

export default DemandRatio;
