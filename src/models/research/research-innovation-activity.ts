import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const researchInnovationActivityTypeValues = [
    "Incubation",
    "StartupMentoring",
    "PrototypeDevelopment",
    "SeedFunding",
    "Hackathon",
    "InnovationWorkshop",
    "TechnologyTransfer",
    "EntrepreneurshipCell",
    "IndustryCollaboration",
] as const;

export const researchInnovationActivityStageValues = [
    "Planned",
    "Ongoing",
    "Completed",
] as const;

export type ResearchInnovationActivityType =
    (typeof researchInnovationActivityTypeValues)[number];
export type ResearchInnovationActivityStage =
    (typeof researchInnovationActivityStageValues)[number];

export interface IResearchInnovationActivity extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    activityType: ResearchInnovationActivityType;
    title: string;
    leadName?: string;
    partnerName?: string;
    startDate?: Date;
    endDate?: Date;
    participantCount?: number;
    fundingAmount?: number;
    stage: ResearchInnovationActivityStage;
    outcomeSummary?: string;
    followUpAction?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const ResearchInnovationActivitySchema = new Schema<IResearchInnovationActivity>(
    {
        planId: {
            type: Schema.Types.ObjectId,
            ref: "ResearchInnovationPlan",
            required: true,
            index: true,
        },
        assignmentId: {
            type: Schema.Types.ObjectId,
            ref: "ResearchInnovationAssignment",
            required: true,
            index: true,
        },
        activityType: {
            type: String,
            enum: researchInnovationActivityTypeValues,
            required: true,
            default: "Incubation",
            index: true,
        },
        title: { type: String, required: true, trim: true },
        leadName: { type: String, trim: true },
        partnerName: { type: String, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        participantCount: { type: Number, min: 0 },
        fundingAmount: { type: Number, min: 0 },
        stage: {
            type: String,
            enum: researchInnovationActivityStageValues,
            required: true,
            default: "Ongoing",
            index: true,
        },
        outcomeSummary: { type: String, trim: true },
        followUpAction: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "research_innovation_activities" }
);

ResearchInnovationActivitySchema.index(
    { assignmentId: 1, displayOrder: 1, title: 1 }
);

const ResearchInnovationActivity: Model<IResearchInnovationActivity> =
    mongoose.models.ResearchInnovationActivity ||
    mongoose.model<IResearchInnovationActivity>(
        "ResearchInnovationActivity",
        ResearchInnovationActivitySchema
    );

export default ResearchInnovationActivity;
