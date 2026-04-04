import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const sustainabilityAuditTypeValues = [
    "GreenAudit",
    "EnergyAudit",
    "EnvironmentAudit",
    "Other",
] as const;

export type SustainabilityAuditType = (typeof sustainabilityAuditTypeValues)[number];

export interface ISustainabilityAudit extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    auditType: SustainabilityAuditType;
    auditAgency?: string;
    auditYear?: number;
    auditScore?: number;
    recommendations?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const SustainabilityAuditSchema = new Schema<ISustainabilityAudit>(
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
        auditType: {
            type: String,
            enum: sustainabilityAuditTypeValues,
            required: true,
            default: "GreenAudit",
            index: true,
        },
        auditAgency: { type: String, trim: true },
        auditYear: { type: Number, min: 1900, max: 3000 },
        auditScore: { type: Number },
        recommendations: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "sustainability_audits" }
);

SustainabilityAuditSchema.index({
    assignmentId: 1,
    displayOrder: 1,
    auditType: 1,
    auditYear: 1,
});

const SustainabilityAudit: Model<ISustainabilityAudit> =
    mongoose.models.SustainabilityAudit ||
    mongoose.model<ISustainabilityAudit>("SustainabilityAudit", SustainabilityAuditSchema);

export default SustainabilityAudit;
