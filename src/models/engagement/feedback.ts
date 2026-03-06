import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IFeedback extends Document {
    type: 'StudentSatisfaction' | 'Employer' | 'Alumni' | 'Parent' | 'Expert' | 'Peer' | 'General';
    academicYear: string;
    schoolName: string;
    respondentName?: string;
    respondentEmail?: string;
    responses: {
        question: string;
        score?: number;
        text?: string;
    }[];
    overallScore?: number;
    suggestions?: string;

    userId?: Types.ObjectId; // If linked to a system user

    createdAt: Date;
    updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
    {
        type: {
            type: String,
            required: true,
            enum: ['StudentSatisfaction', 'Employer', 'Alumni', 'Parent', 'Expert', 'Peer', 'General'],
            index: true
        },
        academicYear: { type: String, required: true, index: true },
        schoolName: { type: String, required: true, index: true },
        respondentName: { type: String },
        respondentEmail: { type: String },
        responses: [{
            question: { type: String, required: true },
            score: { type: Number, min: 1, max: 5 },
            text: { type: String },
        }],
        overallScore: { type: Number },
        suggestions: { type: String },

        userId: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

const Feedback: Model<IFeedback> =
    mongoose.models.Feedback || mongoose.model<IFeedback>("Feedback", FeedbackSchema);

export default Feedback;
