import mongoose, { Schema, Document, Model } from "mongoose";

// --- News/Notification Schema ---

export interface ISystemMisc extends Document {
    type: 'News' | 'Notification' | 'VisitorCount' | 'DashboardStat';
    title?: string;
    content?: any;
    category?: string;
    targetRoles: string[];
    expiresAt?: Date;
    isActive: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const SystemMiscSchema = new Schema<ISystemMisc>(
    {
        type: { type: String, required: true, enum: ['News', 'Notification', 'VisitorCount', 'DashboardStat'], index: true },
        title: { type: String },
        content: { type: Schema.Types.Mixed },
        category: { type: String, index: true },
        targetRoles: { type: [String], default: [] },
        expiresAt: { type: Date },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const SystemMisc: Model<ISystemMisc> =
    mongoose.models.SystemMisc || mongoose.model<ISystemMisc>("SystemMisc", SystemMiscSchema);

export default SystemMisc;
