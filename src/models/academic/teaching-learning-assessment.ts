import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const teachingLearningAssessmentTypeValues = [
    "Assignment",
    "Quiz",
    "Tutorial",
    "Internal Test",
    "Lab Evaluation",
    "Presentation",
    "Project Review",
    "Other",
] as const;

export type TeachingLearningAssessmentType =
    (typeof teachingLearningAssessmentTypeValues)[number];

export interface ITeachingLearningAssessment extends Document {
    assignmentId: Types.ObjectId;
    planId: Types.ObjectId;
    title: string;
    assessmentType: TeachingLearningAssessmentType;
    weightage: number;
    scheduledDate?: Date;
    evaluatedDate?: Date;
    coMappingCodes: string[];
    maxMarks?: number;
    averageMarks?: number;
    attainmentPercentage?: number;
    remarks?: string;
    documentId?: Types.ObjectId;
    isCompleted: boolean;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const TeachingLearningAssessmentSchema = new Schema<ITeachingLearningAssessment>(
    {
        assignmentId: {
            type: Schema.Types.ObjectId,
            ref: "TeachingLearningAssignment",
            required: true,
            index: true,
        },
        planId: { type: Schema.Types.ObjectId, ref: "TeachingLearningPlan", required: true, index: true },
        title: { type: String, required: true, trim: true },
        assessmentType: {
            type: String,
            enum: teachingLearningAssessmentTypeValues,
            required: true,
            default: "Assignment",
        },
        weightage: { type: Number, required: true, min: 0, default: 0 },
        scheduledDate: { type: Date },
        evaluatedDate: { type: Date },
        coMappingCodes: { type: [String], default: [] },
        maxMarks: { type: Number, min: 0 },
        averageMarks: { type: Number, min: 0 },
        attainmentPercentage: { type: Number, min: 0, max: 100 },
        remarks: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        isCompleted: { type: Boolean, required: true, default: false, index: true },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "teaching_learning_assessments" }
);

TeachingLearningAssessmentSchema.index({ assignmentId: 1, title: 1, displayOrder: 1 });
TeachingLearningAssessmentSchema.index({ assignmentId: 1, displayOrder: 1, scheduledDate: 1 });

const TeachingLearningAssessment: Model<ITeachingLearningAssessment> =
    mongoose.models.TeachingLearningAssessment ||
    mongoose.model<ITeachingLearningAssessment>(
        "TeachingLearningAssessment",
        TeachingLearningAssessmentSchema
    );

export default TeachingLearningAssessment;
