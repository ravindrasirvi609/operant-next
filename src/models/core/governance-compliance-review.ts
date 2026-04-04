import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const governanceComplianceReviewTypeValues = [
    "AcademicAudit",
    "AdministrativeAudit",
    "NAACReadiness",
    "NIRFReview",
    "StatutoryCompliance",
    "InternalQualityReview",
    "ISOReview",
    "Other",
] as const;

export const governanceComplianceReviewStatusValues = [
    "Scheduled",
    "Completed",
    "ActionTaken",
    "Closed",
    "Escalated",
] as const;

export const governanceComplianceRiskLevelValues = [
    "Low",
    "Moderate",
    "High",
    "Critical",
] as const;

export type GovernanceComplianceReviewType =
    (typeof governanceComplianceReviewTypeValues)[number];
export type GovernanceComplianceReviewStatus =
    (typeof governanceComplianceReviewStatusValues)[number];
export type GovernanceComplianceRiskLevel =
    (typeof governanceComplianceRiskLevelValues)[number];

export interface IGovernanceComplianceReview extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    reviewType: GovernanceComplianceReviewType;
    title: string;
    reviewDate?: Date;
    status: GovernanceComplianceReviewStatus;
    riskLevel: GovernanceComplianceRiskLevel;
    observationsSummary?: string;
    actionTakenSummary?: string;
    remarks?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const GovernanceComplianceReviewSchema = new Schema<IGovernanceComplianceReview>(
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
        reviewType: {
            type: String,
            enum: governanceComplianceReviewTypeValues,
            required: true,
            default: "InternalQualityReview",
            index: true,
        },
        title: { type: String, required: true, trim: true },
        reviewDate: { type: Date },
        status: {
            type: String,
            enum: governanceComplianceReviewStatusValues,
            required: true,
            default: "Scheduled",
            index: true,
        },
        riskLevel: {
            type: String,
            enum: governanceComplianceRiskLevelValues,
            required: true,
            default: "Moderate",
            index: true,
        },
        observationsSummary: { type: String, trim: true },
        actionTakenSummary: { type: String, trim: true },
        remarks: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "governance_compliance_reviews" }
);

GovernanceComplianceReviewSchema.index({ assignmentId: 1, displayOrder: 1, reviewType: 1, title: 1 });

const GovernanceComplianceReview: Model<IGovernanceComplianceReview> =
    mongoose.models.GovernanceComplianceReview ||
    mongoose.model<IGovernanceComplianceReview>(
        "GovernanceComplianceReview",
        GovernanceComplianceReviewSchema
    );

export default GovernanceComplianceReview;
