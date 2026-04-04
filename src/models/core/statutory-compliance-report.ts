import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const statutoryComplianceStatusValues = ["Draft", "Submitted", "Accepted", "Rejected"] as const;

export interface IStatutoryComplianceReport extends Document {
    institutionId: Types.ObjectId;
    reportTitle: string;
    reportYear: number;
    submittedToBodyId?: Types.ObjectId;
    submissionDate?: Date;
    complianceStatus: (typeof statutoryComplianceStatusValues)[number];
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const StatutoryComplianceReportSchema = new Schema<IStatutoryComplianceReport>(
    {
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
        reportTitle: { type: String, required: true, trim: true },
        reportYear: { type: Number, required: true, min: 2000, index: true },
        submittedToBodyId: { type: Schema.Types.ObjectId, ref: "RegulatoryBody" },
        submissionDate: { type: Date },
        complianceStatus: {
            type: String,
            enum: statutoryComplianceStatusValues,
            required: true,
            default: "Draft",
            index: true,
        },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "statutory_compliance_reports" }
);

const StatutoryComplianceReport: Model<IStatutoryComplianceReport> =
    mongoose.models.StatutoryComplianceReport ||
    mongoose.model<IStatutoryComplianceReport>("StatutoryComplianceReport", StatutoryComplianceReportSchema);

export default StatutoryComplianceReport;
