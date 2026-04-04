import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const sssSurveyStatusValues = ["Draft", "Active", "Closed"] as const;

export type SssSurveyStatus = (typeof sssSurveyStatusValues)[number];

export interface ISssSurvey extends Document {
    institutionId: Types.ObjectId;
    academicYearId: Types.ObjectId;
    surveyTitle: string;
    surveyStatus: SssSurveyStatus;
    startDate: Date;
    endDate: Date;
    createdByUserId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const SssSurveySchema = new Schema<ISssSurvey>(
    {
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
        surveyTitle: { type: String, required: true, trim: true },
        surveyStatus: {
            type: String,
            enum: sssSurveyStatusValues,
            required: true,
            default: "Draft",
            index: true,
        },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true, collection: "sss_surveys" }
);

SssSurveySchema.index({ academicYearId: 1, surveyTitle: 1 }, { unique: true });
SssSurveySchema.index({ institutionId: 1, surveyStatus: 1, endDate: -1 });

const SssSurvey: Model<ISssSurvey> =
    mongoose.models.SssSurvey || mongoose.model<ISssSurvey>("SssSurvey", SssSurveySchema);

export default SssSurvey;
