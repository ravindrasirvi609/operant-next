import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const wasteManagementPracticeTypeValues = [
    "Solid",
    "Liquid",
    "EWaste",
    "Biomedical",
    "Other",
] as const;

export type WasteManagementPracticeType =
    (typeof wasteManagementPracticeTypeValues)[number];

export interface IWasteManagementPractice extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    practiceType: WasteManagementPracticeType;
    methodology?: string;
    implementedDate?: Date;
    impactSummary?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const WasteManagementPracticeSchema = new Schema<IWasteManagementPractice>(
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
        practiceType: {
            type: String,
            enum: wasteManagementPracticeTypeValues,
            required: true,
            default: "Solid",
            index: true,
        },
        methodology: { type: String, trim: true },
        implementedDate: { type: Date },
        impactSummary: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "waste_management_practices" }
);

WasteManagementPracticeSchema.index({
    assignmentId: 1,
    displayOrder: 1,
    practiceType: 1,
});

const WasteManagementPractice: Model<IWasteManagementPractice> =
    mongoose.models.WasteManagementPractice ||
    mongoose.model<IWasteManagementPractice>(
        "WasteManagementPractice",
        WasteManagementPracticeSchema
    );

export default WasteManagementPractice;
