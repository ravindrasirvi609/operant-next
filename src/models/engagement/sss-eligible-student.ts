import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ISssEligibleStudent extends Document {
    surveyId: Types.ObjectId;
    studentId: Types.ObjectId;
    isResponseSubmitted: boolean;
    responseSubmittedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const SssEligibleStudentSchema = new Schema<ISssEligibleStudent>(
    {
        surveyId: { type: Schema.Types.ObjectId, ref: "SssSurvey", required: true, index: true },
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
        isResponseSubmitted: { type: Boolean, required: true, default: false, index: true },
        responseSubmittedAt: { type: Date },
    },
    { timestamps: true, collection: "sss_eligible_students" }
);

SssEligibleStudentSchema.index({ surveyId: 1, studentId: 1 }, { unique: true });

const SssEligibleStudent: Model<ISssEligibleStudent> =
    mongoose.models.SssEligibleStudent ||
    mongoose.model<ISssEligibleStudent>("SssEligibleStudent", SssEligibleStudentSchema);

export default SssEligibleStudent;
