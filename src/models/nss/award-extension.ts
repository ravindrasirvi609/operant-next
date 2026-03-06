import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAwardExtension extends Document {
    activityName: string;
    awardName: string;
    govBodyName: string;
    academicYear: string;
    uploadProof?: string;
    createdAt: Date;
    updatedAt: Date;
}

const AwardExtensionSchema = new Schema<IAwardExtension>(
    {
        activityName: {
            type: String,
            required: [true, "Activity name is required"],
            trim: true,
        },
        awardName: {
            type: String,
            required: [true, "Award name is required"],
            trim: true,
        },
        govBodyName: {
            type: String,
            required: [true, "Government body name is required"],
            trim: true,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        uploadProof: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "awardforextensionactivities",
    }
);

const AwardExtension: Model<IAwardExtension> =
    mongoose.models.AwardExtension ||
    mongoose.model<IAwardExtension>("AwardExtension", AwardExtensionSchema);

export default AwardExtension;
