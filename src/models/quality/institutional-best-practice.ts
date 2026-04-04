import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IInstitutionalBestPractice extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    practiceTitle: string;
    objectives?: string;
    context?: string;
    implementationDetails?: string;
    evidenceOfSuccess?: string;
    problemsEncountered?: string;
    resourcesRequired?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const InstitutionalBestPracticeSchema = new Schema<IInstitutionalBestPractice>(
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
        practiceTitle: { type: String, required: true, trim: true },
        objectives: { type: String, trim: true },
        context: { type: String, trim: true },
        implementationDetails: { type: String, trim: true },
        evidenceOfSuccess: { type: String, trim: true },
        problemsEncountered: { type: String, trim: true },
        resourcesRequired: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "institutional_best_practices" }
);

InstitutionalBestPracticeSchema.index({
    assignmentId: 1,
    displayOrder: 1,
    practiceTitle: 1,
});

const InstitutionalBestPractice: Model<IInstitutionalBestPractice> =
    mongoose.models.InstitutionalBestPractice ||
    mongoose.model<IInstitutionalBestPractice>(
        "InstitutionalBestPractice",
        InstitutionalBestPracticeSchema
    );

export default InstitutionalBestPractice;
