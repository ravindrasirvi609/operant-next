import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ICampusEvent extends Document {
    title: string;
    type: 'Conference' | 'Workshop' | 'Seminar' | 'NSS' | 'Sports' | 'Cultural' | 'YouthFestival' | 'ExtensionActivity';
    level: 'National' | 'International' | 'University' | 'Local';
    fromDate?: Date;
    toDate?: Date;
    venue?: string;
    organizer: string;
    fundedBy?: string;
    numberOfParticipants?: number;
    participantsInfo?: Record<string, unknown>[];
    outcome?: string;
    uploadProof?: string;

    // Relationships
    userId?: Types.ObjectId; // Organizer or Representative
    collegeName: string;

    createdAt: Date;
    updatedAt: Date;
}

const CampusEventSchema = new Schema<ICampusEvent>(
    {
        title: { type: String, required: true, trim: true },
        type: {
            type: String,
            required: true,
            enum: ['Conference', 'Workshop', 'Seminar', 'NSS', 'Sports', 'Cultural', 'YouthFestival', 'ExtensionActivity'],
            index: true
        },
        level: {
            type: String,
            enum: ['National', 'International', 'University', 'Local'],
            default: 'University'
        },
        fromDate: { type: Date },
        toDate: { type: Date },
        venue: { type: String },
        organizer: { type: String, required: true },
        fundedBy: { type: String },
        numberOfParticipants: { type: Number, min: 0 },
        participantsInfo: { type: [Schema.Types.Mixed], default: [] },
        outcome: { type: String },
        uploadProof: { type: String },

        userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        collegeName: { type: String, required: true, index: true },
    },
    { timestamps: true }
);

const CampusEvent: Model<ICampusEvent> =
    mongoose.models.CampusEvent ||
    mongoose.model<ICampusEvent>("CampusEvent", CampusEventSchema);

export default CampusEvent;
