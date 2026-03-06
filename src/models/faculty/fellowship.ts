import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IFellowship extends Document {
    teacherName: string;
    awardName: string;
    awardYear: string;
    awardingAgency: string;
    isNat: string;
    year: string;
    proof?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FellowshipSchema = new Schema<IFellowship>(
    {
        teacherName: {
            type: String,
            required: [true, "Teacher name is required"],
            trim: true,
        },
        awardName: {
            type: String,
            required: [true, "Award name is required"],
            trim: true,
        },
        awardYear: {
            type: String,
            required: [true, "Award year is required"],
        },
        awardingAgency: {
            type: String,
            required: [true, "Awarding agency is required"],
            trim: true,
        },
        isNat: {
            type: String,
            required: [true, "Level (National/International) is required"],
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
        collection: "fellowships",
    }
);

const Fellowship: Model<IFellowship> =
    mongoose.models.Fellowship ||
    mongoose.model<IFellowship>("Fellowship", FellowshipSchema);

export default Fellowship;
