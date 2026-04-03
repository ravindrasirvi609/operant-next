import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const curriculumBloomLevelValues = [
    "Remember",
    "Understand",
    "Apply",
    "Analyze",
    "Evaluate",
    "Create",
] as const;

export type CurriculumBloomLevel = (typeof curriculumBloomLevelValues)[number];

export interface ICurriculumCourseOutcome extends Document {
    curriculumId: Types.ObjectId;
    curriculumCourseId: Types.ObjectId;
    syllabusVersionId: Types.ObjectId;
    coCode: string;
    description: string;
    bloomLevel?: CurriculumBloomLevel;
    targetAttainmentPercentage?: number;
    displayOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CurriculumCourseOutcomeSchema = new Schema<ICurriculumCourseOutcome>(
    {
        curriculumId: { type: Schema.Types.ObjectId, ref: "CurriculumPlan", required: true, index: true },
        curriculumCourseId: {
            type: Schema.Types.ObjectId,
            ref: "CurriculumCourse",
            required: true,
            index: true,
        },
        syllabusVersionId: {
            type: Schema.Types.ObjectId,
            ref: "CurriculumSyllabusVersion",
            required: true,
            index: true,
        },
        coCode: { type: String, required: true, trim: true, uppercase: true },
        description: { type: String, required: true, trim: true },
        bloomLevel: { type: String, enum: curriculumBloomLevelValues },
        targetAttainmentPercentage: { type: Number, min: 0, max: 100 },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
        isActive: { type: Boolean, required: true, default: true, index: true },
    },
    { timestamps: true, collection: "course_outcomes" }
);

CurriculumCourseOutcomeSchema.index(
    { syllabusVersionId: 1, coCode: 1 },
    { unique: true }
);

const CurriculumCourseOutcome: Model<ICurriculumCourseOutcome> =
    mongoose.models.CurriculumCourseOutcome ||
    mongoose.model<ICurriculumCourseOutcome>(
        "CurriculumCourseOutcome",
        CurriculumCourseOutcomeSchema
    );

export default CurriculumCourseOutcome;
