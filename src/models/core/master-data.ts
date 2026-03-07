import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IMasterData extends Document {
    category: string;
    key: string;
    label: string;
    code?: string;
    description?: string;
    parentCategory?: string;
    parentKey?: string;
    metadata?: Record<string, unknown>;
    isActive: boolean;
    sortOrder: number;
    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const MasterDataSchema = new Schema<IMasterData>(
    {
        category: { type: String, required: true, trim: true, index: true },
        key: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        code: { type: String, trim: true },
        description: { type: String, trim: true },
        parentCategory: { type: String, trim: true },
        parentKey: { type: String, trim: true },
        metadata: { type: Schema.Types.Mixed, default: {} },
        isActive: { type: Boolean, default: true, index: true },
        sortOrder: { type: Number, default: 0 },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    {
        timestamps: true,
        collection: "master_data",
    }
);

MasterDataSchema.index({ category: 1, key: 1 }, { unique: true });
MasterDataSchema.index({ category: 1, isActive: 1, sortOrder: 1, label: 1 });

const MasterData: Model<IMasterData> =
    mongoose.models.MasterData ||
    mongoose.model<IMasterData>("MasterData", MasterDataSchema);

export default MasterData;
