import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEvent extends Document {
    eventTitle: string;
    eventSummary: string;
    eventDuration: string;
    photos: Record<string, any>[];
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
    {
        eventTitle: {
            type: String,
            required: [true, "Event title is required"],
            unique: true,
            trim: true,
        },
        eventSummary: {
            type: String,
            required: [true, "Event summary is required"],
            trim: true,
        },
        eventDuration: {
            type: String,
            required: [true, "Event duration is required"],
        },
        photos: {
            type: [Object],
            required: [true, "Photos are required"],
        },
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "events",
    }
);

const Event: Model<IEvent> =
    mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);

export default Event;
