import mongoose, { Schema, Document, Model } from "mongoose";

export interface INssBasicInfo extends Document {
    studentName: string;
    parentName: string;
    gender: string;
    state?: string;
    district?: string;
    mobileNo: number;
    address: string;
    email: string;
    createdByEmail: string;
    otherAreaOfInterest: string;
    dob: string;
    createdAt: Date;
    updatedAt: Date;
}

const NssBasicInfoSchema = new Schema<INssBasicInfo>(
    {
        studentName: {
            type: String,
            required: [true, "Student name is required"],
            trim: true,
        },
        parentName: {
            type: String,
            required: [true, "Parent name is required"],
            trim: true,
        },
        gender: {
            type: String,
            required: [true, "Gender is required"],
        },
        state: {
            type: String,
        },
        district: {
            type: String,
        },
        mobileNo: {
            type: Number,
            required: [true, "Mobile number is required"],
        },
        address: {
            type: String,
            required: [true, "Address is required"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
            index: true,
        },
        createdByEmail: {
            type: String,
            required: [true, "Creator email is required"],
            lowercase: true,
            trim: true,
        },
        otherAreaOfInterest: {
            type: String,
            required: [true, "Area of interest is required"],
        },
        dob: {
            type: String,
            required: [true, "Date of birth is required"],
        },
    },
    {
        timestamps: true,
        collection: "nssbasicinfos",
    }
);

const NssBasicInfo: Model<INssBasicInfo> =
    mongoose.models.NssBasicInfo ||
    mongoose.model<INssBasicInfo>("NssBasicInfo", NssBasicInfoSchema);

export default NssBasicInfo;
