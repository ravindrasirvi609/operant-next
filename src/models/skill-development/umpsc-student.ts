import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUmpscStudent extends Document {
    academicYear: string;
    studentName: string;
    gender: string;
    category: string;
    isMinority: string;
    email: string;
    mobile: string;
    address: string;
    district: string;
    createdAt: Date;
    updatedAt: Date;
}

const UmpscStudentSchema = new Schema<IUmpscStudent>(
    {
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        studentName: {
            type: String,
            required: [true, "Student name is required"],
            trim: true,
        },
        gender: {
            type: String,
            required: [true, "Gender is required"],
        },
        category: {
            type: String,
            required: [true, "Category is required"],
        },
        isMinority: {
            type: String,
            required: [true, "Minority status is required"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        mobile: {
            type: String,
            required: [true, "Mobile number is required"],
        },
        address: {
            type: String,
            required: [true, "Address is required"],
        },
        district: {
            type: String,
            required: [true, "District is required"],
        },
    },
    {
        timestamps: true,
        collection: "umpscstudents",
    }
);

const UmpscStudent: Model<IUmpscStudent> =
    mongoose.models.UmpscStudent ||
    mongoose.model<IUmpscStudent>("UmpscStudent", UmpscStudentSchema);

export default UmpscStudent;
