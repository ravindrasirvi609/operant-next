import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ICasSupportingDocument extends Document {
    casApplicationId: Types.ObjectId;
    documentId: Types.ObjectId;
    documentType: string;
    label: string;
    isMandatory: boolean;
    uploadedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const CasSupportingDocumentSchema = new Schema<ICasSupportingDocument>(
    {
        casApplicationId: { type: Schema.Types.ObjectId, ref: "CasApplication", required: true, index: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true },
        documentType: { type: String, required: true, trim: true, uppercase: true, index: true },
        label: { type: String, required: true, trim: true },
        isMandatory: { type: Boolean, default: true, index: true },
        uploadedAt: { type: Date, default: Date.now },
    },
    { timestamps: true, collection: "cas_supporting_documents" }
);

CasSupportingDocumentSchema.index({ casApplicationId: 1, documentType: 1 }, { unique: true });

const CasSupportingDocument: Model<ICasSupportingDocument> =
    mongoose.models.CasSupportingDocument ||
    mongoose.model<ICasSupportingDocument>("CasSupportingDocument", CasSupportingDocumentSchema);

export default CasSupportingDocument;

