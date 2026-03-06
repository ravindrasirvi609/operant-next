import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IResearchGuidance extends Document {
    isResearchGuide: string;
    year: string;
    proof: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ResearchGuidanceSchema = new Schema<IResearchGuidance>(
    {
        isResearchGuide: {
            type: String,
            required: true,
        },
        year: {
            type: String,
            required: [true, "Year is required"],
            index: true,
        },
        proof: {
            type: String,
            required: [true, "Proof is required"],
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
        collection: "researchguidances",
    }
);

const ResearchGuidance: Model<IResearchGuidance> =
    mongoose.models.ResearchGuidance ||
    mongoose.model<IResearchGuidance>("ResearchGuidance", ResearchGuidanceSchema);

export default ResearchGuidance;
