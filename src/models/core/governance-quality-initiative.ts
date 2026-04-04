import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const governanceQualityInitiativeTypeValues = [
    "AcademicAudit",
    "FeedbackAnalysis",
    "BestPractice",
    "CapacityBuilding",
    "GreenCampus",
    "DigitalGovernance",
    "AccreditationReadiness",
    "StakeholderOutreach",
    "Other",
] as const;

export const governanceQualityInitiativeStatusValues = [
    "Planned",
    "InProgress",
    "Completed",
    "OnHold",
    "Continuous",
] as const;

export type GovernanceQualityInitiativeType =
    (typeof governanceQualityInitiativeTypeValues)[number];
export type GovernanceQualityInitiativeStatus =
    (typeof governanceQualityInitiativeStatusValues)[number];

export interface IGovernanceQualityInitiative extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    initiativeType: GovernanceQualityInitiativeType;
    title: string;
    startDate?: Date;
    endDate?: Date;
    status: GovernanceQualityInitiativeStatus;
    ownerName?: string;
    impactSummary?: string;
    remarks?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const GovernanceQualityInitiativeSchema = new Schema<IGovernanceQualityInitiative>(
    {
        planId: {
            type: Schema.Types.ObjectId,
            ref: "GovernanceLeadershipIqacPlan",
            required: true,
            index: true,
        },
        assignmentId: {
            type: Schema.Types.ObjectId,
            ref: "GovernanceLeadershipIqacAssignment",
            required: true,
            index: true,
        },
        initiativeType: {
            type: String,
            enum: governanceQualityInitiativeTypeValues,
            required: true,
            default: "AcademicAudit",
            index: true,
        },
        title: { type: String, required: true, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        status: {
            type: String,
            enum: governanceQualityInitiativeStatusValues,
            required: true,
            default: "Planned",
            index: true,
        },
        ownerName: { type: String, trim: true },
        impactSummary: { type: String, trim: true },
        remarks: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "governance_quality_initiatives" }
);

GovernanceQualityInitiativeSchema.index({ assignmentId: 1, displayOrder: 1, initiativeType: 1, title: 1 });

const GovernanceQualityInitiative: Model<IGovernanceQualityInitiative> =
    mongoose.models.GovernanceQualityInitiative ||
    mongoose.model<IGovernanceQualityInitiative>(
        "GovernanceQualityInitiative",
        GovernanceQualityInitiativeSchema
    );

export default GovernanceQualityInitiative;
