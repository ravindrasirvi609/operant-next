import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAuditLog extends Document {
    userId?: Types.ObjectId;
    action: string;
    tableName: string;
    recordId?: string;
    oldData?: unknown;
    newData?: unknown;
    ipAddress?: string;
    createdAt: Date;
    updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
        action: { type: String, required: true, trim: true, index: true },
        tableName: { type: String, required: true, trim: true, index: true },
        recordId: { type: String, trim: true, index: true },
        oldData: { type: Schema.Types.Mixed },
        newData: { type: Schema.Types.Mixed },
        ipAddress: { type: String, trim: true },
    },
    { timestamps: true, collection: "audit_logs" }
);

AuditLogSchema.index({ tableName: 1, recordId: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

const AuditLog: Model<IAuditLog> =
    mongoose.models.AuditLog ||
    mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;

