import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFullTimeTeacherLeft extends Document {
    name: string;
    idNumber: string;
    yearInWhichLeft: number;
    email: string;
    gender: string;
    designation: string;
    natureOfPost: string;
    dateOfJoining: string;
    dateOfLeaving: string;
    academicYear: string;
    createdAt: Date;
    updatedAt: Date;
}

const FullTimeTeacherLeftSchema = new Schema<IFullTimeTeacherLeft>(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        idNumber: {
            type: String,
            required: [true, "ID Number is required"],
            trim: true,
        },
        yearInWhichLeft: {
            type: Number,
            required: [true, "Year left is required"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
            index: true,
        },
        gender: {
            type: String,
            required: [true, "Gender is required"],
        },
        designation: {
            type: String,
            required: [true, "Designation is required"],
            trim: true,
        },
        natureOfPost: {
            type: String,
            required: [true, "Nature of post is required"],
        },
        dateOfJoining: {
            type: String,
            required: [true, "Date of joining is required"],
        },
        dateOfLeaving: {
            type: String,
            required: [true, "Date of leaving is required"],
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "esttfulltimeteacherwholefts",
    }
);

const FullTimeTeacherLeft: Model<IFullTimeTeacherLeft> =
    mongoose.models.FullTimeTeacherWhoLeft ||
    mongoose.model<IFullTimeTeacherLeft>(
        "FullTimeTeacherWhoLeft",
        FullTimeTeacherLeftSchema
    );

export default FullTimeTeacherLeft;
