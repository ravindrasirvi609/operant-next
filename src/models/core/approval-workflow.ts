import mongoose, { Document, Model, Schema } from "mongoose";

export type ApprovalModuleName = "PBAS" | "CAS" | "AQAR";

export interface IApprovalWorkflow extends Document {
    moduleName: ApprovalModuleName;
    recordId: string;
    currentApproverRole: string;
    status: string;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ApprovalWorkflowSchema = new Schema<IApprovalWorkflow>(
    {
        moduleName: {
            type: String,
            enum: ["PBAS", "CAS", "AQAR"],
            required: true,
            index: true,
        },
        recordId: { type: String, required: true, trim: true, index: true },
        currentApproverRole: { type: String, required: true, trim: true },
        status: { type: String, required: true, trim: true, index: true },
        remarks: { type: String, trim: true },
    },
    { timestamps: true, collection: "approval_workflow" }
);

ApprovalWorkflowSchema.index({ moduleName: 1, recordId: 1 }, { unique: true });

const ApprovalWorkflow: Model<IApprovalWorkflow> =
    mongoose.models.ApprovalWorkflow ||
    mongoose.model<IApprovalWorkflow>("ApprovalWorkflow", ApprovalWorkflowSchema);

export default ApprovalWorkflow;

