import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProgramFeedback extends Document {
    response: string;
    program: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ProgramFeedbackSchema = new Schema<IProgramFeedback>(
    {
        response: {
            type: String,
            required: [true, "Response is required"],
        },
        program: {
            type: Schema.Types.ObjectId,
            required: [true, "Program reference is required"],
            ref: "Program",
        },
    },
    {
        timestamps: true,
        collection: "programfeedbacks",
    }
);

const ProgramFeedback: Model<IProgramFeedback> =
    mongoose.models.ProgramFeedback ||
    mongoose.model<IProgramFeedback>("ProgramFeedback", ProgramFeedbackSchema);

export default ProgramFeedback;
