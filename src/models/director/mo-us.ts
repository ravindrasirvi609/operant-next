import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMoUs extends Document {
    nameOfOrganisation: string;
    durationOfMoU: string;
    yearOfSigningMoU: string;
    otherUser?: string;
    uploadProof?: string;
    schoolName: string;
    userId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const MoUsSchema = new Schema<IMoUs>(
    {
        nameOfOrganisation: {
            type: String,
            required: [true, "Organisation name is required"],
            trim: true,
        },
        durationOfMoU: {
            type: String,
            required: [true, "Duration is required"],
        },
        yearOfSigningMoU: {
            type: String,
            required: [true, "Year of signing is required"],
            index: true,
        },
        otherUser: {
            type: String,
            trim: true,
        },
        uploadProof: {
            type: String,
        },
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
        collection: "mous",
    }
);

const MoUs: Model<IMoUs> =
    mongoose.models.MoUs || mongoose.model<IMoUs>("MoUs", MoUsSchema);

export default MoUs;
