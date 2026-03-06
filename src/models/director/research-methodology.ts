import mongoose, { Schema, Document, Model } from "mongoose";

export interface IResearchMethodology extends Document {
    nameOfWorkshopSeminar: string;
    numberOfParticipants: number;
    year?: string;
    fromDate?: string;
    toDate?: string;
    otherUser?: string;
    uploadProof?: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const ResearchMethodologySchema = new Schema<IResearchMethodology>(
    {
        nameOfWorkshopSeminar: {
            type: String,
            required: [true, "Name of workshop/seminar is required"],
            trim: true,
        },
        numberOfParticipants: {
            type: Number,
            required: [true, "Number of participants is required"],
            min: [0, "Cannot be negative"],
        },
        year: {
            type: String,
            index: true,
        },
        fromDate: {
            type: String,
        },
        toDate: {
            type: String,
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
        collection: "researchmethodologyworkshops",
    }
);

const ResearchMethodology: Model<IResearchMethodology> =
    mongoose.models.ResearchMethodology ||
    mongoose.model<IResearchMethodology>(
        "ResearchMethodology",
        ResearchMethodologySchema
    );

export default ResearchMethodology;
