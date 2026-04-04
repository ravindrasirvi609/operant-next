import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const aisheSurveySubmissionStatusValues = ["Preparation", "Submitted", "Locked"] as const;

export type AisheSurveySubmissionStatus = (typeof aisheSurveySubmissionStatusValues)[number];

export interface IAisheSurveyCycle extends Document {
    academicYearId: Types.ObjectId;
    surveyYearLabel: string;
    submissionStartDate?: Date;
    submissionEndDate?: Date;
    submissionStatus: AisheSurveySubmissionStatus;
    createdAt: Date;
    updatedAt: Date;
}

const AisheSurveyCycleSchema = new Schema<IAisheSurveyCycle>(
    {
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, unique: true, index: true },
        surveyYearLabel: { type: String, required: true, trim: true, unique: true, index: true },
        submissionStartDate: { type: Date },
        submissionEndDate: { type: Date },
        submissionStatus: {
            type: String,
            enum: aisheSurveySubmissionStatusValues,
            required: true,
            default: "Preparation",
            index: true,
        },
    },
    { timestamps: true, collection: "aishe_survey_cycles" }
);

const AisheSurveyCycle: Model<IAisheSurveyCycle> =
    mongoose.models.AisheSurveyCycle ||
    mongoose.model<IAisheSurveyCycle>("AisheSurveyCycle", AisheSurveyCycleSchema);

export default AisheSurveyCycle;
