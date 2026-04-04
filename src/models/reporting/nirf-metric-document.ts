import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const nirfMetricDocumentVerificationStatusValues = ["Pending", "Verified", "Rejected"] as const;

export interface INirfMetricDocument extends Document {
    metricValueId: Types.ObjectId;
    documentId: Types.ObjectId;
    documentPurpose?: string;
    verificationStatus: (typeof nirfMetricDocumentVerificationStatusValues)[number];
    createdAt: Date;
    updatedAt: Date;
}

const NirfMetricDocumentSchema = new Schema<INirfMetricDocument>(
    {
        metricValueId: { type: Schema.Types.ObjectId, ref: "NirfMetricValue", required: true, index: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true, index: true },
        documentPurpose: { type: String, trim: true },
        verificationStatus: {
            type: String,
            enum: nirfMetricDocumentVerificationStatusValues,
            required: true,
            default: "Pending",
            index: true,
        },
    },
    { timestamps: true, collection: "nirf_metric_documents" }
);

const NirfMetricDocument: Model<INirfMetricDocument> =
    mongoose.models.NirfMetricDocument ||
    mongoose.model<INirfMetricDocument>("NirfMetricDocument", NirfMetricDocumentSchema);

export default NirfMetricDocument;
