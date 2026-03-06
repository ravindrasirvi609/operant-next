import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICounselingGuidance extends Document {
    nameOfActivity: string;
    numberOfStudentsAttended: number;
    activityType: string;
    uploadProof?: string;
    yearOfActivity?: string;
    otherUser?: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const CounselingGuidanceSchema = new Schema<ICounselingGuidance>(
    {
        nameOfActivity: {
            type: String,
            required: [true, "Activity name is required"],
            trim: true,
        },
        numberOfStudentsAttended: {
            type: Number,
            required: [true, "Number of students is required"],
            min: [0, "Cannot be negative"],
        },
        activityType: {
            type: String,
            required: [true, "Activity type is required"],
            trim: true,
        },
        uploadProof: {
            type: String,
        },
        yearOfActivity: {
            type: String,
            index: true,
        },
        otherUser: {
            type: String,
            trim: true,
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
        collection: "counselingandguidances",
    }
);

const CounselingGuidance: Model<ICounselingGuidance> =
    mongoose.models.CounselingGuidance ||
    mongoose.model<ICounselingGuidance>(
        "CounselingGuidance",
        CounselingGuidanceSchema
    );

export default CounselingGuidance;
