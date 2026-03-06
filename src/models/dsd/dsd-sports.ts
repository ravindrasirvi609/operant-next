import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDsdSports extends Document {
    nameOfAward: string;
    nameOfEvent: string;
    nameOfStudent: string;
    academicYear: string;
    teamIndividual: string;
    isNat: string;
    userType: string;
    proof?: string;
    createdAt: Date;
    updatedAt: Date;
}

const DsdSportsSchema = new Schema<IDsdSports>(
    {
        nameOfAward: {
            type: String,
            required: [true, "Award name is required"],
            trim: true,
        },
        nameOfEvent: {
            type: String,
            required: [true, "Event name is required"],
            trim: true,
        },
        nameOfStudent: {
            type: String,
            required: [true, "Student name is required"],
            trim: true,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        teamIndividual: {
            type: String,
            required: [true, "Team/Individual is required"],
        },
        isNat: {
            type: String,
            required: [true, "National/International status is required"],
        },
        userType: {
            type: String,
            required: [true, "User type is required"],
        },
        proof: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "dsdsports",
    }
);

const DsdSports: Model<IDsdSports> =
    mongoose.models.DsdSports ||
    mongoose.model<IDsdSports>("DsdSports", DsdSportsSchema);

export default DsdSports;
