import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStandardUser extends Document {
    name: string;
    designation?: string;
    email: string;
    photoURL: string;
    department: string;
    password?: string;
    createdAt: Date;
    updatedAt: Date;
}

const StandardUserSchema = new Schema<IStandardUser>(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        designation: {
            type: String,
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
    }
);

const createStandardUserModel = (modelName: string, collectionName: string) => {
    return (
        mongoose.models[modelName] ||
        mongoose.model<IStandardUser>(modelName, StandardUserSchema, collectionName)
    );
};

export const SkillUser = createStandardUserModel("SkillUser", "skillusers");
export const SportsUser = createStandardUserModel("SportsUser", "sportsusers");
export const SwayamUser = createStandardUserModel("SwayamUser", "swayamusers");
export const NssUser = createStandardUserModel("NssUser", "nssusers");
export const UshaUser = createStandardUserModel("UshaUser", "usha_users");
export const ProUser = createStandardUserModel("ProUser", "pro_users");
export const PgUser = createStandardUserModel("PgUser", "pg_users");
export const PlacementUser = createStandardUserModel("PlacementUser", "placement_users");
export const ExamUser = createStandardUserModel("ExamUser", "examusers");
export const EsttUser = createStandardUserModel("EsttUser", "esttusers");
export const DsdUser = createStandardUserModel("DsdUser", "dsdusers");
export const KrcUser = createStandardUserModel("KrcUser", "krcusers");
