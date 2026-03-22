import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type NotificationKind = "workflow" | "reminder" | "document" | "system";
export type NotificationModuleName =
    | "PBAS"
    | "CAS"
    | "AQAR"
    | "EVIDENCE"
    | "FACULTY"
    | "STUDENT"
    | "SYSTEM";
export type NotificationChannelStatus = "delivered" | "read";
export type NotificationEmailStatus = "pending" | "skipped" | "sent" | "failed";

export interface INotificationDelivery {
    status: NotificationChannelStatus;
    deliveredAt?: Date;
    readAt?: Date;
}

export interface INotificationEmailDelivery {
    status: NotificationEmailStatus;
    sentAt?: Date;
    failureReason?: string;
}

export interface INotification extends Document {
    userId: Types.ObjectId;
    kind: NotificationKind;
    moduleName?: NotificationModuleName;
    entityId?: string;
    href?: string;
    title: string;
    message: string;
    actorId?: Types.ObjectId;
    actorName?: string;
    metadata?: Record<string, unknown>;
    inApp: INotificationDelivery;
    email?: INotificationEmailDelivery;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationDeliverySchema = new Schema<INotificationDelivery>(
    {
        status: {
            type: String,
            enum: ["delivered", "read"],
            required: true,
            default: "delivered",
        },
        deliveredAt: { type: Date, default: Date.now },
        readAt: { type: Date },
    },
    { _id: false }
);

const NotificationEmailDeliverySchema = new Schema<INotificationEmailDelivery>(
    {
        status: {
            type: String,
            enum: ["pending", "skipped", "sent", "failed"],
            required: true,
            default: "pending",
        },
        sentAt: { type: Date },
        failureReason: { type: String, trim: true },
    },
    { _id: false }
);

const NotificationSchema = new Schema<INotification>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        kind: {
            type: String,
            enum: ["workflow", "reminder", "document", "system"],
            required: true,
            index: true,
        },
        moduleName: {
            type: String,
            enum: ["PBAS", "CAS", "AQAR", "EVIDENCE", "FACULTY", "STUDENT", "SYSTEM"],
            index: true,
        },
        entityId: { type: String, trim: true, index: true },
        href: { type: String, trim: true },
        title: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        actorId: { type: Schema.Types.ObjectId, ref: "User" },
        actorName: { type: String, trim: true },
        metadata: { type: Schema.Types.Mixed },
        inApp: { type: NotificationDeliverySchema, default: () => ({}) },
        email: { type: NotificationEmailDeliverySchema, default: () => ({}) },
    },
    { timestamps: true, collection: "notifications" }
);

NotificationSchema.index({ userId: 1, "inApp.status": 1, createdAt: -1 });
NotificationSchema.index({ moduleName: 1, entityId: 1, createdAt: -1 });

const Notification: Model<INotification> =
    mongoose.models.Notification ||
    mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
