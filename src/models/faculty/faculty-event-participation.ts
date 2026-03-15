import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type FacultyEventRole = "Participant" | "ResourcePerson" | "Chair";

export interface IFacultyEventParticipation extends Document {
    facultyId: Types.ObjectId;
    eventId: Types.ObjectId;
    role: FacultyEventRole;
    paperPresented: boolean;
    paperTitle?: string;
    organized: boolean;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyEventParticipationSchema = new Schema<IFacultyEventParticipation>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
        role: {
            type: String,
            required: true,
            enum: ["Participant", "ResourcePerson", "Chair"],
            index: true,
        },
        paperPresented: { type: Boolean, default: false },
        paperTitle: { type: String, trim: true },
        organized: { type: Boolean, default: false, index: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "faculty_event_participation" }
);

FacultyEventParticipationSchema.index({ facultyId: 1, eventId: 1, role: 1 });

const FacultyEventParticipation: Model<IFacultyEventParticipation> =
    mongoose.models.FacultyEventParticipation ||
    mongoose.model<IFacultyEventParticipation>("FacultyEventParticipation", FacultyEventParticipationSchema);

export default FacultyEventParticipation;
