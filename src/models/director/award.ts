import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAward extends Document {
    titleOfInnovation: string;
    nameOfAward: string;
    yearOfAward: string;
    nameOfAwardingAgency: string;
    contactDetailsAgency: string;
    category: string;
    otherUser?: string;
    uploadProof?: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const AwardSchema = new Schema<IAward>(
    {
        titleOfInnovation: {
            type: String,
            required: [true, "Title of innovation is required"],
            trim: true,
        },
        nameOfAward: {
            type: String,
            required: [true, "Name of award is required"],
            trim: true,
        },
        yearOfAward: {
            type: String,
            required: [true, "Year of award is required"],
            index: true,
        },
        nameOfAwardingAgency: {
            type: String,
            required: [true, "Awarding agency is required"],
            trim: true,
        },
        contactDetailsAgency: {
            type: String,
            required: [true, "Contact details are required"],
            trim: true,
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
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
    },
    {
        timestamps: true,
        collection: "awards",
    }
);

const Award: Model<IAward> =
    mongoose.models.Award || mongoose.model<IAward>("Award", AwardSchema);

export default Award;
