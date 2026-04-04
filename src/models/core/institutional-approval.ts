import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const institutionalApprovalStatusValues = ["Active", "Expired", "Pending", "Revoked"] as const;

export interface IInstitutionalApproval extends Document {
    institutionId: Types.ObjectId;
    regulatoryBodyId: Types.ObjectId;
    approvalType: string;
    approvalReferenceNo?: string;
    approvalStartDate?: Date;
    approvalEndDate?: Date;
    status: (typeof institutionalApprovalStatusValues)[number];
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const InstitutionalApprovalSchema = new Schema<IInstitutionalApproval>(
    {
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
        regulatoryBodyId: { type: Schema.Types.ObjectId, ref: "RegulatoryBody", required: true, index: true },
        approvalType: { type: String, required: true, trim: true, index: true },
        approvalReferenceNo: { type: String, trim: true },
        approvalStartDate: { type: Date },
        approvalEndDate: { type: Date },
        status: {
            type: String,
            enum: institutionalApprovalStatusValues,
            required: true,
            default: "Active",
            index: true,
        },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "institutional_approvals" }
);

const InstitutionalApproval: Model<IInstitutionalApproval> =
    mongoose.models.InstitutionalApproval ||
    mongoose.model<IInstitutionalApproval>("InstitutionalApproval", InstitutionalApprovalSchema);

export default InstitutionalApproval;
