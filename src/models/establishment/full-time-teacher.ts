import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFullTimeTeacher extends Document {
    name: string;
    idNumber: string;
    email: string;
    gender: string;
    designation: string;
    natureOfPost: string;
    dateOfJoining: string;
    academicYear: string;
    createdAt: Date;
    updatedAt: Date;
}

const FullTimeTeacherSchema = new Schema<IFullTimeTeacher>(
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
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "esttfulltimeteachers",
    }
);

const FullTimeTeacher: Model<IFullTimeTeacher> =
    mongoose.models.FullTimeTeacher ||
    mongoose.model<IFullTimeTeacher>("FullTimeTeacher", FullTimeTeacherSchema);

export default FullTimeTeacher;
