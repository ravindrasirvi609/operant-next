import mongoose, { Schema, Document, Model } from "mongoose";

export interface IYfCollege extends Document {
    collegeName: string;
    principalName: string;
    district?: string;
    collegeCode?: string;
    email: string;
    address?: string;
    mobile: string;
    password?: string;
    createdAt: Date;
    updatedAt: Date;
}

const YfCollegeSchema = new Schema<IYfCollege>(
    {
        collegeName: {
            type: String,
            required: [true, "College name is required"],
            trim: true,
        },
        principalName: {
            type: String,
            required: [true, "Principal name is required"],
            trim: true,
        },
        district: {
            type: String,
        },
        collegeCode: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
        },
        address: {
            type: String,
        },
        mobile: {
            type: String,
            required: [true, "Mobile number is required"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            select: false,
        },
    },
    {
        timestamps: true,
        collection: "yfcolleges",
    }
);

const YfCollege: Model<IYfCollege> =
    mongoose.models.YfCollege ||
    mongoose.model<IYfCollege>("YfCollege", YfCollegeSchema);

export default YfCollege;
