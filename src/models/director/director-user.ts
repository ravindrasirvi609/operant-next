import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDirectorUser extends Document {
    salutation: string;
    photoURL: string;
    mobileNumber: string;
    name: string;
    email: string;
    designation: string;
    department: string;
    gender: string;
    password?: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
}

const DirectorUserSchema = new Schema<IDirectorUser>(
    {
        salutation: {
            type: String,
            required: [true, "Salutation is required"],
        },
        photoURL: {
            type: String,
            required: [true, "Photo URL is required"],
        },
        mobileNumber: {
            type: String,
            required: [true, "Mobile number is required"],
        },
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        designation: {
            type: String,
            required: [true, "Designation is required"],
            trim: true,
        },
        department: {
            type: String,
            required: [true, "Department is required"],
            unique: true,
            trim: true,
            index: true,
        },
        gender: {
            type: String,
            required: [true, "Gender is required"],
            enum: ["Male", "Female", "Other"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            select: false,
        },
        role: {
            type: String,
            required: true,
            default: "director",
            enum: ["director", "admin"], // Based on current logic
        },
    },
    {
        timestamps: true,
        collection: "directorUsers",
    }
);

const DirectorUser: Model<IDirectorUser> =
    mongoose.models.DirectorUser ||
    mongoose.model<IDirectorUser>("DirectorUser", DirectorUserSchema);

export default DirectorUser;
