import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IStudentEventParticipation extends Document {
    studentId: Types.ObjectId;
    eventId: Types.ObjectId;
    role: "Participant" | "Presenter";
    paperTitle?: string;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const StudentEventParticipationSchema = new Schema<IStudentEventParticipation>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
        eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
        role: { type: String, required: true, enum: ["Participant", "Presenter"], index: true },
        paperTitle: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "student_event_participation" }
);

StudentEventParticipationSchema.index({ studentId: 1, eventId: 1, role: 1 });

const StudentEventParticipation: Model<IStudentEventParticipation> =
    mongoose.models.StudentEventParticipation ||
    mongoose.model<IStudentEventParticipation>("StudentEventParticipation", StudentEventParticipationSchema);

export default StudentEventParticipation;
