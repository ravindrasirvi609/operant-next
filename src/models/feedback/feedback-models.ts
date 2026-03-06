import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFeedbackBase extends Document {
    academicYear: string;
    schoolName: string;
    questions?: string;
    response: string;
    createdAt: Date;
    updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedbackBase>(
    {
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
        questions: {
            type: String,
        },
        response: {
            type: String,
            required: [true, "Response is required"],
        },
    },
    {
        timestamps: true,
    }
);

// Helper to create models for different feedback types
const createFeedbackModel = (modelName: string, collectionName: string) => {
    return (
        mongoose.models[modelName] ||
        mongoose.model<IFeedbackBase>(modelName, FeedbackSchema, collectionName)
    );
};

export const AlumniFeedback = createFeedbackModel("AlumniFeedback", "alumnifeedback");
export const EmployerFeedback = createFeedbackModel("EmployerFeedback", "employerfeedback");
export const ExpertFeedback = createFeedbackModel("ExpertFeedback", "expertfeedback");
export const ParentFeedback = createFeedbackModel("ParentFeedback", "parentfeedback");
export const StudentFeedback = createFeedbackModel("StudentFeedback", "studentfeedback");
export const TeacherFeedback = createFeedbackModel("TeacherFeedback", "teacherfeedback");
