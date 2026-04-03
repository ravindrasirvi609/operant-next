import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const researchInnovationGrantTypeValues = [
    "SeedFunding",
    "InnovationGrant",
    "PrototypeGrant",
    "StartupSupport",
    "ResearchTranslationGrant",
] as const;

export const researchInnovationGrantStageValues = [
    "Proposed",
    "Sanctioned",
    "Released",
    "Utilized",
    "Closed",
] as const;

export type ResearchInnovationGrantType =
    (typeof researchInnovationGrantTypeValues)[number];
export type ResearchInnovationGrantStage =
    (typeof researchInnovationGrantStageValues)[number];

export interface IResearchInnovationGrant extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    grantType: ResearchInnovationGrantType;
    title: string;
    schemeName?: string;
    sponsorName?: string;
    beneficiaryName?: string;
    sanctionedAmount?: number;
    releasedAmount?: number;
    awardDate?: Date;
    stage: ResearchInnovationGrantStage;
    outcomeSummary?: string;
    followUpAction?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const ResearchInnovationGrantSchema = new Schema<IResearchInnovationGrant>(
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
        grantType: {
            type: String,
            enum: researchInnovationGrantTypeValues,
            required: true,
            default: "SeedFunding",
            index: true,
        },
        title: { type: String, required: true, trim: true },
        schemeName: { type: String, trim: true },
        sponsorName: { type: String, trim: true },
        beneficiaryName: { type: String, trim: true },
        sanctionedAmount: { type: Number, min: 0 },
        releasedAmount: { type: Number, min: 0 },
        awardDate: { type: Date },
        stage: {
            type: String,
            enum: researchInnovationGrantStageValues,
            required: true,
            default: "Proposed",
            index: true,
        },
        outcomeSummary: { type: String, trim: true },
        followUpAction: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "research_innovation_grants" }
);

ResearchInnovationGrantSchema.index({ assignmentId: 1, displayOrder: 1, title: 1 });

const ResearchInnovationGrant: Model<IResearchInnovationGrant> =
    mongoose.models.ResearchInnovationGrant ||
    mongoose.model<IResearchInnovationGrant>(
        "ResearchInnovationGrant",
        ResearchInnovationGrantSchema
    );

export default ResearchInnovationGrant;
