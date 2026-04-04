import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const governancePolicyCircularTypeValues = [
    "Policy",
    "Circular",
    "SOP",
    "Guidelines",
    "Manual",
    "CodeOfConduct",
    "StrategicPlan",
    "Other",
] as const;

export const governancePolicyCircularRevisionStatusValues = [
    "New",
    "Reviewed",
    "Revised",
    "Active",
    "Archived",
] as const;

export type GovernancePolicyCircularType =
    (typeof governancePolicyCircularTypeValues)[number];
export type GovernancePolicyCircularRevisionStatus =
    (typeof governancePolicyCircularRevisionStatusValues)[number];

export interface IGovernancePolicyCircular extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    policyType: GovernancePolicyCircularType;
    title: string;
    issueDate?: Date;
    issuingAuthority?: string;
    applicabilityScope?: string;
    revisionStatus: GovernancePolicyCircularRevisionStatus;
    summary?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const GovernancePolicyCircularSchema = new Schema<IGovernancePolicyCircular>(
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
        policyType: {
            type: String,
            enum: governancePolicyCircularTypeValues,
            required: true,
            default: "Policy",
            index: true,
        },
        title: { type: String, required: true, trim: true },
        issueDate: { type: Date },
        issuingAuthority: { type: String, trim: true },
        applicabilityScope: { type: String, trim: true },
        revisionStatus: {
            type: String,
            enum: governancePolicyCircularRevisionStatusValues,
            required: true,
            default: "New",
            index: true,
        },
        summary: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "governance_policy_circulars" }
);

GovernancePolicyCircularSchema.index({ assignmentId: 1, displayOrder: 1, policyType: 1, title: 1 });

const GovernancePolicyCircular: Model<IGovernancePolicyCircular> =
    mongoose.models.GovernancePolicyCircular ||
    mongoose.model<IGovernancePolicyCircular>(
        "GovernancePolicyCircular",
        GovernancePolicyCircularSchema
    );

export default GovernancePolicyCircular;
