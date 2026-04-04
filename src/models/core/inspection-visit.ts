import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const inspectionVisitStatusValues = ["Scheduled", "Completed", "ActionPending", "Closed"] as const;

export interface IInspectionVisit extends Document {
    regulatoryBodyId: Types.ObjectId;
    institutionId: Types.ObjectId;
    visitDate: Date;
    inspectionType: string;
    inspectionReportDocumentId?: Types.ObjectId;
    complianceDeadline?: Date;
    status: (typeof inspectionVisitStatusValues)[number];
    createdAt: Date;
    updatedAt: Date;
}

const InspectionVisitSchema = new Schema<IInspectionVisit>(
    {
        regulatoryBodyId: { type: Schema.Types.ObjectId, ref: "RegulatoryBody", required: true, index: true },
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
        visitDate: { type: Date, required: true, index: true },
        inspectionType: { type: String, required: true, trim: true },
        inspectionReportDocumentId: { type: Schema.Types.ObjectId, ref: "Document" },
        complianceDeadline: { type: Date },
        status: {
            type: String,
            enum: inspectionVisitStatusValues,
            required: true,
            default: "Scheduled",
            index: true,
        },
    },
    { timestamps: true, collection: "inspection_visits" }
);

const InspectionVisit: Model<IInspectionVisit> =
    mongoose.models.InspectionVisit ||
    mongoose.model<IInspectionVisit>("InspectionVisit", InspectionVisitSchema);

export default InspectionVisit;
