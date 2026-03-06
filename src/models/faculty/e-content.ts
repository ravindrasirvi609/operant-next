import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IEContent extends Document {
    moduleName: string;
    creationType?: string;
    platform?: string;
    link?: string;
    proof?: string;
    year: string;
    otherUser?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const EContentSchema = new Schema<IEContent>(
    {
        moduleName: {
            type: String,
            required: [true, "Module name is required"],
            trim: true,
        },
        creationType: {
            type: String,
        },
        platform: {
            type: String,
            trim: true,
        },
        link: {
            type: String,
            trim: true,
        },
        proof: {
            type: String,
        },
        year: {
            type: String,
            required: [true, "Year is required"],
            index: true,
        },
        otherUser: {
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
        collection: "econtentdevelopeds",
    }
);

const EContent: Model<IEContent> =
    mongoose.models.EContent ||
    mongoose.model<IEContent>("EContent", EContentSchema);

export default EContent;
