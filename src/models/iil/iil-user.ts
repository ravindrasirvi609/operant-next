import mongoose, { Schema, Document, Model } from "mongoose";

export interface IIilUser extends Document {
    name: string;
    email: string;
    photoURL: string;
    department: string;
    password?: string;
    createdAt: Date;
    updatedAt: Date;
}

const IilUserSchema = new Schema<IIilUser>(
    {
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
            index: true,
        },
        photoURL: {
            type: String,
            required: [true, "Photo URL is required"],
        },
        department: {
            type: String,
            required: [true, "Department is required"],
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            select: false,
        },
    },
    {
        timestamps: true,
        collection: "iilusers",
    }
);

const IilUser: Model<IIilUser> =
    mongoose.models.IilUser ||
    mongoose.model<IIilUser>("IilUser", IilUserSchema);

export default IilUser;
