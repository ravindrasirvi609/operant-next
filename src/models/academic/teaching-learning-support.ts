import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const teachingLearningSupportTypeValues = [
    "Remedial",
    "Advanced Learner",
    "Mentoring",
    "Bridge Course",
    "Revision",
    "Counselling",
    "Peer Learning",
    "Other",
] as const;

export type TeachingLearningSupportType =
    (typeof teachingLearningSupportTypeValues)[number];

export interface ITeachingLearningSupport extends Document {
    assignmentId: Types.ObjectId;
    planId: Types.ObjectId;
    title: string;
    supportType: TeachingLearningSupportType;
    targetGroup?: string;
    interventionDate?: Date;
    participantCount?: number;
    outcomeSummary?: string;
    followUpAction?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const TeachingLearningSupportSchema = new Schema<ITeachingLearningSupport>(
    {
        assignmentId: {
            type: Schema.Types.ObjectId,
            ref: "TeachingLearningAssignment",
            required: true,
            index: true,
        },
        planId: { type: Schema.Types.ObjectId, ref: "TeachingLearningPlan", required: true, index: true },
        title: { type: String, required: true, trim: true },
        supportType: {
            type: String,
            enum: teachingLearningSupportTypeValues,
            required: true,
            default: "Remedial",
        },
        targetGroup: { type: String, trim: true },
        interventionDate: { type: Date },
        participantCount: { type: Number, min: 0 },
        outcomeSummary: { type: String, trim: true },
        followUpAction: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "teaching_learning_supports" }
);

TeachingLearningSupportSchema.index({ assignmentId: 1, displayOrder: 1, interventionDate: 1 });

const TeachingLearningSupport: Model<ITeachingLearningSupport> =
    mongoose.models.TeachingLearningSupport ||
    mongoose.model<ITeachingLearningSupport>(
        "TeachingLearningSupport",
        TeachingLearningSupportSchema
    );

export default TeachingLearningSupport;
