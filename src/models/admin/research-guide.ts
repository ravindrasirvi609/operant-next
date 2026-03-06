import mongoose, { Schema, Document, Model } from "mongoose";

export interface IResearchGuide extends Document {
    fullTimeTeacher: string;
    qualification?: string;
    researchCenterName: string;
    year: string;
    proof?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ResearchGuideSchema = new Schema<IResearchGuide>(
    {
        fullTimeTeacher: {
            type: String,
            required: [true, "Teacher name is required"],
            trim: true,
            index: true,
        },
        qualification: {
            type: String,
            trim: true,
        },
        researchCenterName: {
            type: String,
            required: [true, "Research center name is required"],
            trim: true,
        },
        year: {
            type: String,
            required: [true, "Year is required"],
            index: true,
        },
        proof: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: "researchguideadmins",
    }
);

const ResearchGuide: Model<IResearchGuide> =
    mongoose.models.ResearchGuide ||
    mongoose.model<IResearchGuide>("ResearchGuide", ResearchGuideSchema);

export default ResearchGuide;
