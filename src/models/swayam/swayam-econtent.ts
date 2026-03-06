import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISwayamEContent extends Document {
    moduleName: string;
    creationType?: string;
    platform?: string;
    link?: string;
    proof?: string;
    year: string;
    createdAt: Date;
    updatedAt: Date;
}

const SwayamEContentSchema = new Schema<ISwayamEContent>(
    {
        moduleName: {
            type: String,
            required: [true, "Module name is required"],
            trim: true,
        },
        creationType: { type: String },
        platform: { type: String },
        link: { type: String },
        proof: { type: String },
        year: {
            type: String,
            required: [true, "Year is required"],
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "swayamecontentdevelopeds",
    }
);

const SwayamEContent: Model<ISwayamEContent> =
    mongoose.models.SwayamEContent ||
    mongoose.model<ISwayamEContent>("SwayamEContent", SwayamEContentSchema);

export default SwayamEContent;
