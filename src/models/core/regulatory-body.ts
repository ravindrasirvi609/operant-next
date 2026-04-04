import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRegulatoryBody extends Document {
    bodyName: string;
    jurisdiction?: string;
    websiteUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

const RegulatoryBodySchema = new Schema<IRegulatoryBody>(
    {
        bodyName: { type: String, required: true, trim: true, unique: true, index: true },
        jurisdiction: { type: String, trim: true },
        websiteUrl: { type: String, trim: true },
    },
    { timestamps: true, collection: "regulatory_bodies" }
);

const RegulatoryBody: Model<IRegulatoryBody> =
    mongoose.models.RegulatoryBody ||
    mongoose.model<IRegulatoryBody>("RegulatoryBody", RegulatoryBodySchema);

export default RegulatoryBody;
