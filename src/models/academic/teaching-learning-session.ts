import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const teachingLearningSessionMethodValues = [
    "Lecture",
    "Tutorial",
    "Lab",
    "Project",
    "Case Study",
    "Experiential",
    "Seminar",
    "Blended",
    "Other",
] as const;

export type TeachingLearningSessionMethod =
    (typeof teachingLearningSessionMethodValues)[number];

export interface ITeachingLearningSession extends Document {
    assignmentId: Types.ObjectId;
    planId: Types.ObjectId;
    sessionNumber: number;
    moduleTitle?: string;
    topic: string;
    plannedDate?: Date;
    deliveredDate?: Date;
    teachingMethod: TeachingLearningSessionMethod;
    ictTool?: string;
    attendancePercent?: number;
    learningOutcome?: string;
    reflectionNotes?: string;
    documentId?: Types.ObjectId;
    isDelivered: boolean;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const TeachingLearningSessionSchema = new Schema<ITeachingLearningSession>(
    {
        assignmentId: {
            type: Schema.Types.ObjectId,
            ref: "TeachingLearningAssignment",
            required: true,
            index: true,
        },
        planId: { type: Schema.Types.ObjectId, ref: "TeachingLearningPlan", required: true, index: true },
        sessionNumber: { type: Number, required: true, min: 1 },
        moduleTitle: { type: String, trim: true },
        topic: { type: String, required: true, trim: true },
        plannedDate: { type: Date },
        deliveredDate: { type: Date },
        teachingMethod: {
            type: String,
            enum: teachingLearningSessionMethodValues,
            required: true,
            default: "Lecture",
        },
        ictTool: { type: String, trim: true },
        attendancePercent: { type: Number, min: 0, max: 100 },
        learningOutcome: { type: String, trim: true },
        reflectionNotes: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        isDelivered: { type: Boolean, required: true, default: false, index: true },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "teaching_learning_sessions" }
);

TeachingLearningSessionSchema.index({ assignmentId: 1, sessionNumber: 1 }, { unique: true });
TeachingLearningSessionSchema.index({ assignmentId: 1, displayOrder: 1, plannedDate: 1 });

const TeachingLearningSession: Model<ITeachingLearningSession> =
    mongoose.models.TeachingLearningSession ||
    mongoose.model<ITeachingLearningSession>(
        "TeachingLearningSession",
        TeachingLearningSessionSchema
    );

export default TeachingLearningSession;
