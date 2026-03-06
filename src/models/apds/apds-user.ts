import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApdsUser extends Document {
    name?: string;
    email: string;
    photoURL?: string;
    department: string;
    password?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ApdsUserSchema = new Schema<IApdsUser>(
    {
        name: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        photoURL: {
            type: String,
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
        collection: "apdsUsers", // preserving original collection name
    }
);

const ApdsUser: Model<IApdsUser> =
    mongoose.models.ApdsUser ||
    mongoose.model<IApdsUser>("ApdsUser", ApdsUserSchema);

export default ApdsUser;
