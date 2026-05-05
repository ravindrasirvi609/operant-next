import mongoose, { Document, Model, Schema, Types } from "mongoose";

import type { UploadCategory } from "@/lib/upload/policy";

export interface IUploadIntent extends Document {
    userId: Types.ObjectId;
    category: UploadCategory;
    originalFileName: string;
    storagePath: string;
    expiresAt: Date;
    completedAt?: Date;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const UploadIntentSchema = new Schema<IUploadIntent>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        category: {
            type: String,
            enum: ["profile-photo", "document", "evidence"],
            required: true,
            index: true,
        },
        originalFileName: { type: String, required: true, trim: true },
        storagePath: { type: String, required: true, trim: true, unique: true },
        expiresAt: { type: Date, required: true, index: true },
        completedAt: { type: Date, index: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "upload_intents" }
);

UploadIntentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
UploadIntentSchema.index({ userId: 1, category: 1, createdAt: -1 });

const UploadIntent: Model<IUploadIntent> =
    mongoose.models.UploadIntent ||
    mongoose.model<IUploadIntent>("UploadIntent", UploadIntentSchema);

export default UploadIntent;
