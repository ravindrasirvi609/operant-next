import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IStudentSport extends Document {
    studentId: Types.ObjectId;
    sportId: Types.ObjectId;
    eventName: string;
    level?: "College" | "State" | "National" | "International";
    position?: string;
    eventDate?: Date;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const StudentSportSchema = new Schema<IStudentSport>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
        sportId: { type: Schema.Types.ObjectId, ref: "Sport", required: true, index: true },
        eventName: { type: String, required: true, trim: true },
        level: { type: String, enum: ["College", "State", "National", "International"], index: true },
        position: { type: String, trim: true },
        eventDate: { type: Date },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "student_sports" }
);

StudentSportSchema.index({ studentId: 1, sportId: 1, eventDate: -1 });

const StudentSport: Model<IStudentSport> =
    mongoose.models.StudentSport ||
    mongoose.model<IStudentSport>("StudentSport", StudentSportSchema);

export default StudentSport;
