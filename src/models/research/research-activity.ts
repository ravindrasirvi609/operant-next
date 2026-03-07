import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IResearchActivity extends Document {
    type: 'JRF-SRF' | 'PhDAwarded' | 'ResearchGuidance' | 'ResearchFellowship';
    scholarName: string;
    guideName?: string;
    title?: string;
    duration?: string;
    fromDate?: string;
    toDate?: string;
    fundingAgency?: string;
    fellowshipType?: string;
    year: string;
    status?: 'Ongoing' | 'Completed' | 'Awarded';
    uploadProof?: string;

    // Relationships
    userId: Types.ObjectId; // Link to Faculty Guide/Researcher
    collegeName: string;

    createdAt: Date;
    updatedAt: Date;
}

const ResearchActivitySchema = new Schema<IResearchActivity>(
    {
        type: {
            type: String,
            required: true,
            enum: ['JRF-SRF', 'PhDAwarded', 'ResearchGuidance', 'ResearchFellowship'],
            index: true
        },
        scholarName: { type: String, required: true, trim: true },
        guideName: { type: String, trim: true },
        title: { type: String, trim: true },
        duration: { type: String },
        fromDate: { type: String },
        toDate: { type: String },
        fundingAgency: { type: String },
        fellowshipType: { type: String },
        year: { type: String, required: true, index: true },
        status: { type: String, enum: ['Ongoing', 'Completed', 'Awarded'] },
        uploadProof: { type: String },

        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        collegeName: { type: String, required: true, index: true },
    },
    { timestamps: true }
);

const ResearchActivity: Model<IResearchActivity> =
    mongoose.models.ResearchActivity ||
    mongoose.model<IResearchActivity>("ResearchActivity", ResearchActivitySchema);

export default ResearchActivity;
