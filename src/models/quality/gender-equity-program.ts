import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const genderEquityProgramTypeValues = [
    "Awareness",
    "Workshop",
    "SafetyTraining",
    "Sensitization",
    "Counselling",
    "Other",
] as const;

export type GenderEquityProgramType = (typeof genderEquityProgramTypeValues)[number];

export interface IGenderEquityProgram extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    programType: GenderEquityProgramType;
    title: string;
    conductedDate?: Date;
    participantsCount?: number;
    impactNotes?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const GenderEquityProgramSchema = new Schema<IGenderEquityProgram>(
    {
        planId: {
            type: Schema.Types.ObjectId,
            ref: "InstitutionalValuesBestPracticesPlan",
            required: true,
            index: true,
        },
        assignmentId: {
            type: Schema.Types.ObjectId,
            ref: "InstitutionalValuesBestPracticesAssignment",
            required: true,
            index: true,
        },
        programType: {
            type: String,
            enum: genderEquityProgramTypeValues,
            required: true,
            default: "Awareness",
            index: true,
        },
        title: { type: String, required: true, trim: true },
        conductedDate: { type: Date },
        participantsCount: { type: Number, min: 0 },
        impactNotes: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "gender_equity_programs" }
);

GenderEquityProgramSchema.index({
    assignmentId: 1,
    displayOrder: 1,
    programType: 1,
    title: 1,
});

const GenderEquityProgram: Model<IGenderEquityProgram> =
    mongoose.models.GenderEquityProgram ||
    mongoose.model<IGenderEquityProgram>("GenderEquityProgram", GenderEquityProgramSchema);

export default GenderEquityProgram;
