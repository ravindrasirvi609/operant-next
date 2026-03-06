import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPostHeld extends Document {
    designation: string;
    userDepartment?: string;
    duration?: string;
    durationYears: string[];
    active?: boolean;
    level?: string;
    proof?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PostHeldSchema = new Schema<IPostHeld>(
    {
        designation: {
            type: String,
            required: [true, "Designation is required"],
            trim: true,
        },
        userDepartment: {
            type: String,
            trim: true,
        },
        duration: {
            type: String,
        },
        durationYears: {
            type: [String],
            default: [],
        },
        active: {
            type: Boolean,
            default: true,
        },
        level: {
            type: String,
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
        collection: "posthelds", // pluralized
    }
);

const PostHeld: Model<IPostHeld> =
    mongoose.models.PostHeld ||
    mongoose.model<IPostHeld>("PostHeld", PostHeldSchema);

export default PostHeld;
