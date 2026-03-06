import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUmpscFeedback extends Document {
    academicYear: string;
    response: string;
    createdAt: Date;
    updatedAt: Date;
}

const UmpscFeedbackSchema = new Schema<IUmpscFeedback>(
    {
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        response: {
            type: String,
            required: [true, "Response is required"],
        },
    },
    {
        timestamps: true,
        collection: "umpscfeedbacks",
    }
);

const UmpscFeedback: Model<IUmpscFeedback> =
    mongoose.models.UmpscFeedback ||
    mongoose.model<IUmpscFeedback>("UmpscFeedback", UmpscFeedbackSchema);

export default UmpscFeedback;
