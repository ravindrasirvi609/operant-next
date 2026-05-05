import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IDocument extends Document {
    fileName: string;
    fileUrl: string;
    fileType?: string;
    mimeType?: string;
    sizeBytes?: number;
    storagePath?: string;
    bucketName?: string;
    checksumSha256?: string;
    checksumAlgorithm?: "SHA-256";
    uploadCategory?: "profile-photo" | "document" | "evidence";
    uploadIntentId?: Types.ObjectId;
    uploadedBy?: Types.ObjectId;
    uploadedAt: Date;
    verified: boolean;
    verificationStatus: "Pending" | "Verified" | "Rejected";
    verifiedBy?: Types.ObjectId;
    verifiedAt?: Date;
    verificationRemarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
    {
        fileName: { type: String, required: true, trim: true },
        fileUrl: { type: String, required: true, trim: true },
        fileType: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        sizeBytes: { type: Number, min: 0 },
        storagePath: { type: String, trim: true, index: true, unique: true, sparse: true },
        bucketName: { type: String, trim: true },
        checksumSha256: { type: String, trim: true },
        checksumAlgorithm: { type: String, enum: ["SHA-256"] },
        uploadCategory: {
            type: String,
            enum: ["profile-photo", "document", "evidence"],
            index: true,
        },
        uploadIntentId: { type: Schema.Types.ObjectId, ref: "UploadIntent", index: true },
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
        uploadedAt: { type: Date, default: Date.now, index: true },
        verified: { type: Boolean, default: false, index: true },
        verificationStatus: {
            type: String,
            enum: ["Pending", "Verified", "Rejected"],
            default: "Pending",
            index: true,
        },
        verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
        verifiedAt: { type: Date },
        verificationRemarks: { type: String, trim: true },
    },
    { timestamps: true, collection: "documents" }
);

DocumentSchema.index({ uploadedBy: 1, uploadedAt: -1 });
DocumentSchema.index({ verificationStatus: 1, uploadedAt: -1 });
DocumentSchema.index({ uploadCategory: 1, uploadedAt: -1 });

const DocumentModel: Model<IDocument> =
    mongoose.models.Document ||
    mongoose.model<IDocument>("Document", DocumentSchema);

export default DocumentModel;
