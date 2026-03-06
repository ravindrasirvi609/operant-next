import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGeneralFeedback extends Document {
    email: string;
    feedback: string;
    createdAt: Date;
    updatedAt: Date;
}

const GeneralFeedbackSchema = new Schema<IGeneralFeedback>(
    {
        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
        },
        feedback: {
            type: String,
            required: [true, "Feedback content is required"],
            unique: true,
        },
    },
    {
        timestamps: true,
        collection: "feedbacks",
    }
);

const GeneralFeedback: Model<IGeneralFeedback> =
    mongoose.models.GeneralFeedback ||
    mongoose.model<IGeneralFeedback>("GeneralFeedback", GeneralFeedbackSchema);

export default GeneralFeedback;
