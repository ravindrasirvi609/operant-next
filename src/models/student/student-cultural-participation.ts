import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IStudentCulturalParticipation extends Document {
    studentId: Types.ObjectId;
    activityId: Types.ObjectId;
    eventName: string;
    level?: string;
    position?: string;
    date?: Date;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const StudentCulturalParticipationSchema = new Schema<IStudentCulturalParticipation>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
        activityId: { type: Schema.Types.ObjectId, ref: "CulturalActivity", required: true, index: true },
        eventName: { type: String, required: true, trim: true },
        level: { type: String, trim: true },
        position: { type: String, trim: true },
        date: { type: Date },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "student_cultural_participation" }
);

StudentCulturalParticipationSchema.index({ studentId: 1, activityId: 1, date: -1 });

const StudentCulturalParticipation: Model<IStudentCulturalParticipation> =
    mongoose.models.StudentCulturalParticipation ||
    mongoose.model<IStudentCulturalParticipation>("StudentCulturalParticipation", StudentCulturalParticipationSchema);

export default StudentCulturalParticipation;
