import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const researchInnovationStartupSupportTypeValues = [
    "Incubation",
    "StartupMentoring",
    "PrototypeSupport",
    "PreIncubation",
    "Acceleration",
    "TechnologyTransfer",
] as const;

export const researchInnovationStartupStageValues = [
    "Ideation",
    "Validation",
    "Incubated",
    "MarketReady",
    "Graduated",
] as const;

export type ResearchInnovationStartupSupportType =
    (typeof researchInnovationStartupSupportTypeValues)[number];
export type ResearchInnovationStartupStage =
    (typeof researchInnovationStartupStageValues)[number];

export interface IResearchInnovationStartup extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    startupName: string;
    supportType: ResearchInnovationStartupSupportType;
    stage: ResearchInnovationStartupStage;
    founderNames?: string;
    sector?: string;
    incubationCell?: string;
    registrationNumber?: string;
    supportStartDate?: Date;
    supportEndDate?: Date;
    fundingAmount?: number;
    outcomeSummary?: string;
    followUpAction?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const ResearchInnovationStartupSchema = new Schema<IResearchInnovationStartup>(
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
        startupName: { type: String, required: true, trim: true },
        supportType: {
            type: String,
            enum: researchInnovationStartupSupportTypeValues,
            required: true,
            default: "Incubation",
            index: true,
        },
        stage: {
            type: String,
            enum: researchInnovationStartupStageValues,
            required: true,
            default: "Ideation",
            index: true,
        },
        founderNames: { type: String, trim: true },
        sector: { type: String, trim: true },
        incubationCell: { type: String, trim: true },
        registrationNumber: { type: String, trim: true },
        supportStartDate: { type: Date },
        supportEndDate: { type: Date },
        fundingAmount: { type: Number, min: 0 },
        outcomeSummary: { type: String, trim: true },
        followUpAction: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "research_innovation_startups" }
);

ResearchInnovationStartupSchema.index({ assignmentId: 1, displayOrder: 1, startupName: 1 });

const ResearchInnovationStartup: Model<IResearchInnovationStartup> =
    mongoose.models.ResearchInnovationStartup ||
    mongoose.model<IResearchInnovationStartup>(
        "ResearchInnovationStartup",
        ResearchInnovationStartupSchema
    );

export default ResearchInnovationStartup;
