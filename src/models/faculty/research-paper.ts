import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IResearchPaper extends Document {
    paperTitle: string;
    journalName: string;
    publicationYear: string;
    issnNumber: string;
    authors?: string;
    indexedIn?: string;
    indexData: string[];
    indexLink?: string;
    indexLinkData?: string;
    year: string;
    proof?: string;
    studentId?: string;
    schoolName?: string;
    impactFactor: string;
    isIFActive: boolean;
    ifProof?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ResearchPaperSchema = new Schema<IResearchPaper>(
    {
        paperTitle: {
            type: String,
            required: [true, "Paper title is required"],
            trim: true,
        },
        journalName: {
            type: String,
            required: [true, "Journal name is required"],
            trim: true,
        },
        publicationYear: {
            type: String,
            required: [true, "Publication year is required"],
        },
        issnNumber: {
            type: String,
            required: [true, "ISSN number is required"],
        },
        authors: {
            type: String,
        },
        indexedIn: {
            type: String,
        },
        indexData: {
            type: [String],
            default: [],
        },
        indexLink: {
            type: String,
        },
        indexLinkData: {
            type: String,
        },
        year: {
            type: String,
            required: [true, "Year is required"],
            index: true,
        },
        proof: {
            type: String,
        },
        studentId: {
            type: String,
        },
        schoolName: {
            type: String,
            trim: true,
            index: true,
        },
        impactFactor: {
            type: String,
            default: "N/A",
        },
        isIFActive: {
            type: Boolean,
            default: false,
        },
        ifProof: {
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
        collection: "researchpapers",
    }
);

const ResearchPaper: Model<IResearchPaper> =
    mongoose.models.ResearchPaper ||
    mongoose.model<IResearchPaper>("ResearchPaper", ResearchPaperSchema);

export default ResearchPaper;
