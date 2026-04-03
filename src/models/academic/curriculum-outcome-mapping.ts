import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const curriculumMappingStrengthValues = [1, 2, 3] as const;

export type CurriculumMappingStrength = (typeof curriculumMappingStrengthValues)[number];

export interface ICurriculumOutcomeMapping extends Document {
    curriculumId: Types.ObjectId;
    curriculumCourseId: Types.ObjectId;
    syllabusVersionId: Types.ObjectId;
    courseOutcomeId: Types.ObjectId;
    programOutcomeId: Types.ObjectId;
    mappingStrength: CurriculumMappingStrength;
    createdAt: Date;
    updatedAt: Date;
}

const CurriculumOutcomeMappingSchema = new Schema<ICurriculumOutcomeMapping>(
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
        courseOutcomeId: {
            type: Schema.Types.ObjectId,
            ref: "CurriculumCourseOutcome",
            required: true,
            index: true,
        },
        programOutcomeId: {
            type: Schema.Types.ObjectId,
            ref: "CurriculumProgramOutcome",
            required: true,
            index: true,
        },
        mappingStrength: {
            type: Number,
            enum: curriculumMappingStrengthValues,
            required: true,
            default: 1,
        },
    },
    { timestamps: true, collection: "co_po_mapping" }
);

CurriculumOutcomeMappingSchema.index(
    { courseOutcomeId: 1, programOutcomeId: 1 },
    { unique: true }
);

const CurriculumOutcomeMapping: Model<ICurriculumOutcomeMapping> =
    mongoose.models.CurriculumOutcomeMapping ||
    mongoose.model<ICurriculumOutcomeMapping>(
        "CurriculumOutcomeMapping",
        CurriculumOutcomeMappingSchema
    );

export default CurriculumOutcomeMapping;
