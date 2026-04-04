import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAisheSupportingDocument extends Document {
    surveyCycleId: Types.ObjectId;
    documentId: Types.ObjectId;
    documentCategory: string;
    uploadedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AisheSupportingDocumentSchema = new Schema<IAisheSupportingDocument>(
    {
        surveyCycleId: { type: Schema.Types.ObjectId, ref: "AisheSurveyCycle", required: true, index: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true, index: true },
        documentCategory: { type: String, required: true, trim: true },
        uploadedAt: { type: Date, required: true, default: Date.now },
    },
    { timestamps: true, collection: "aishe_supporting_documents" }
);

const AisheSupportingDocument: Model<IAisheSupportingDocument> =
    mongoose.models.AisheSupportingDocument ||
    mongoose.model<IAisheSupportingDocument>("AisheSupportingDocument", AisheSupportingDocumentSchema);

export default AisheSupportingDocument;
