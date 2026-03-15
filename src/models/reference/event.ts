import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IEvent extends Document {
    title: string;
    eventType: "Seminar" | "Workshop" | "Conference" | "Symposium" | "Webinar" | "Other";
    organizedBy: string;
    startDate?: Date;
    endDate?: Date;
    level?: "College" | "State" | "National" | "International";
    location?: string;
    institutionId?: Types.ObjectId;
    departmentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
    {
        title: { type: String, required: true, trim: true },
        eventType: {
            type: String,
            required: true,
            enum: ["Seminar", "Workshop", "Conference", "Symposium", "Webinar", "Other"],
            index: true,
        },
        organizedBy: { type: String, required: true, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        level: {
            type: String,
            enum: ["College", "State", "National", "International"],
            default: "College",
            index: true,
        },
        location: { type: String, trim: true },
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", index: true },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
    },
    { timestamps: true, collection: "events" }
);

EventSchema.index({ institutionId: 1, eventType: 1, startDate: -1 });

const Event: Model<IEvent> =
    mongoose.models.Event ||
    mongoose.model<IEvent>("Event", EventSchema);

export default Event;
