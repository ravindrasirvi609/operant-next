import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const curriculumProgramOutcomeTypeValues = ["PO", "PSO", "PEO"] as const;

export type CurriculumProgramOutcomeType = (typeof curriculumProgramOutcomeTypeValues)[number];

export interface ICurriculumProgramOutcome extends Document {
    curriculumId: Types.ObjectId;
    programId: Types.ObjectId;
    outcomeType: CurriculumProgramOutcomeType;
    outcomeCode: string;
    description: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CurriculumProgramOutcomeSchema = new Schema<ICurriculumProgramOutcome>(
    {
        curriculumId: { type: Schema.Types.ObjectId, ref: "CurriculumPlan", required: true, index: true },
        programId: { type: Schema.Types.ObjectId, ref: "Program", required: true, index: true },
        outcomeType: {
            type: String,
            enum: curriculumProgramOutcomeTypeValues,
            required: true,
            default: "PO",
            index: true,
        },
        outcomeCode: { type: String, required: true, trim: true, uppercase: true },
        description: { type: String, required: true, trim: true },
        isActive: { type: Boolean, required: true, default: true, index: true },
    },
    { timestamps: true, collection: "curriculum_program_outcomes" }
);

CurriculumProgramOutcomeSchema.index(
    { curriculumId: 1, outcomeType: 1, outcomeCode: 1 },
    { unique: true }
);

const CurriculumProgramOutcome: Model<ICurriculumProgramOutcome> =
    mongoose.models.CurriculumProgramOutcome ||
    mongoose.model<ICurriculumProgramOutcome>(
        "CurriculumProgramOutcome",
        CurriculumProgramOutcomeSchema
    );

export default CurriculumProgramOutcome;
