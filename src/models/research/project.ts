import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IProject extends Document {
    title: string;
    type: 'ResearchProject' | 'Consultancy' | 'CorporateTraining' | 'MoU' | 'Collaboration';
    agencyName: string;
    agencyType: 'Government' | 'Non-Government' | 'Corporate';
    principalInvestigator: string;
    coInvestigators: string[];
    providedFunds?: string;
    duration?: string;
    fromDate?: Date;
    toDate?: Date;
    status: 'Ongoing' | 'Completed' | 'Proposed';
    uploadProof?: string;

    // Relationships
    userId: Types.ObjectId;
    schoolName: string;

    createdAt: Date;
    updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
    {
        title: { type: String, required: true, trim: true },
        type: {
            type: String,
            required: true,
            enum: ['ResearchProject', 'Consultancy', 'CorporateTraining', 'MoU', 'Collaboration'],
            index: true
        },
        agencyName: { type: String, required: true, trim: true },
        agencyType: { type: String, enum: ['Government', 'Non-Government', 'Corporate'] },
        principalInvestigator: { type: String, required: true },
        coInvestigators: { type: [String], default: [] },
        providedFunds: { type: String },
        duration: { type: String },
        fromDate: { type: Date },
        toDate: { type: Date },
        status: { type: String, enum: ['Ongoing', 'Completed', 'Proposed'], default: 'Ongoing' },
        uploadProof: { type: String },

        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        schoolName: { type: String, required: true, index: true },
    },
    { timestamps: true }
);

const Project: Model<IProject> =
    mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);

export default Project;
