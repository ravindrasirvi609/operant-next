import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const complianceActionItemStatusValues = ["Open", "InProgress", "Completed", "Overdue"] as const;

export interface IComplianceActionItem extends Document {
    inspectionId: Types.ObjectId;
    actionTitle: string;
    actionDescription?: string;
    assignedToUserId?: Types.ObjectId;
    targetCompletionDate?: Date;
    completionStatus: (typeof complianceActionItemStatusValues)[number];
    completionDocumentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ComplianceActionItemSchema = new Schema<IComplianceActionItem>(
    {
        inspectionId: { type: Schema.Types.ObjectId, ref: "InspectionVisit", required: true, index: true },
        actionTitle: { type: String, required: true, trim: true },
        actionDescription: { type: String, trim: true },
        assignedToUserId: { type: Schema.Types.ObjectId, ref: "User" },
        targetCompletionDate: { type: Date },
        completionStatus: {
            type: String,
            enum: complianceActionItemStatusValues,
            required: true,
            default: "Open",
            index: true,
        },
        completionDocumentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "compliance_action_items" }
);

const ComplianceActionItem: Model<IComplianceActionItem> =
    mongoose.models.ComplianceActionItem ||
    mongoose.model<IComplianceActionItem>("ComplianceActionItem", ComplianceActionItemSchema);

export default ComplianceActionItem;
