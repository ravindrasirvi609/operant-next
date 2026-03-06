import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProgramPhoto extends Document {
    photoURL: string;
    caption?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ProgramPhotoSchema = new Schema<IProgramPhoto>(
    {
        photoURL: {
            type: String,
            required: [true, "Photo URL is required"],
        },
        caption: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "programphotos",
    }
);

const ProgramPhoto: Model<IProgramPhoto> =
    mongoose.models.ProgramPhoto ||
    mongoose.model<IProgramPhoto>("ProgramPhoto", ProgramPhotoSchema);

export default ProgramPhoto;
