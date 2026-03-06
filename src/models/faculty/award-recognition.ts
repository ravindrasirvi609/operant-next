import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAwardAndRecognition extends Document {
    teacherName: string;
    awardYear?: string;
    pan: string;
    designation: string;
    isNat: string;
    agencyName: string;
    awardName: string;
    incentive: string;
    year: string;
    proof?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const AwardAndRecognitionSchema = new Schema<IAwardAndRecognition>(
    {
        teacherName: {
            type: String,
            required: [true, "Teacher name is required"],
            trim: true,
        },
        awardYear: {
            type: String,
        },
        pan: {
            type: String,
            required: [true, "PAN is required"],
            uppercase: true,
            trim: true,
        },
        designation: {
            type: String,
            required: [true, "Designation is required"],
            trim: true,
        },
        isNat: {
            type: String,
            required: [true, "Level (National/International) is required"],
        },
        agencyName: {
            type: String,
            required: [true, "Agency name is required"],
            trim: true,
        },
        awardName: {
            type: String,
            required: [true, "Award name is required"],
            trim: true,
        },
        incentive: {
            type: String,
            required: [true, "Incentive details are required"],
        },
        year: {
            type: String,
            required: [true, "Year is required"],
            index: true,
        },
        proof: {
            type: String,
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "FacultyUser",
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "awardandrecognitions", // pluralized
    }
);

const AwardAndRecognition: Model<IAwardAndRecognition> =
    mongoose.models.AwardAndRecognition ||
    mongoose.model<IAwardAndRecognition>(
        "AwardAndRecognition",
        AwardAndRecognitionSchema
    );

export default AwardAndRecognition;
