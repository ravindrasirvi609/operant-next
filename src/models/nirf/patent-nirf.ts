import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPatentNirf extends Document {
    publishedCount: number;
    grantedCount: number;
    academicYear: string;
    school: string;
    createdAt: Date;
    updatedAt: Date;
}

const PatentNirfSchema = new Schema<IPatentNirf>(
    {
        publishedCount: {
            type: Number,
            required: [true, "Number of published patents is required"],
        },
        grantedCount: {
            type: Number,
            required: [true, "Number of granted patents is required"],
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        school: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "patentnirfs",
    }
);

const PatentNirf: Model<IPatentNirf> =
    mongoose.models.PatentNirf ||
    mongoose.model<IPatentNirf>("PatentNirf", PatentNirfSchema);

export default PatentNirf;
