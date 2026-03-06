import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IResponsibility extends Document {
    committeeName: string;
    designation?: string;
    institute: string;
    active: boolean;
    duration?: string;
    durationYears: string[];
    proof?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ResponsibilitySchema = new Schema<IResponsibility>(
    {
        committeeName: {
            type: String,
            required: [true, "Committee name is required"],
            trim: true,
        },
        designation: {
            type: String,
            trim: true,
        },
        institute: {
            type: String,
            required: [true, "Institute is required"],
            trim: true,
        },
        active: {
            type: Boolean,
            default: false,
            required: true,
        },
        duration: {
            type: String,
        },
        durationYears: {
            type: [String],
            default: [],
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
        collection: "responsibilities",
    }
);

const Responsibility: Model<IResponsibility> =
    mongoose.models.Responsibility ||
    mongoose.model<IResponsibility>("Responsibility", ResponsibilitySchema);

export default Responsibility;
