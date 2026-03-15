import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IStudentSocialParticipation extends Document {
    studentId: Types.ObjectId;
    programId: Types.ObjectId;
    activityName: string;
    hoursContributed?: number;
    date?: Date;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const StudentSocialParticipationSchema = new Schema<IStudentSocialParticipation>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
        programId: { type: Schema.Types.ObjectId, ref: "SocialProgram", required: true, index: true },
        activityName: { type: String, required: true, trim: true },
        hoursContributed: { type: Number, min: 0 },
        date: { type: Date },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "student_social_participation" }
);

StudentSocialParticipationSchema.index({ studentId: 1, programId: 1, date: -1 });

const StudentSocialParticipation: Model<IStudentSocialParticipation> =
    mongoose.models.StudentSocialParticipation ||
    mongoose.model<IStudentSocialParticipation>("StudentSocialParticipation", StudentSocialParticipationSchema);

export default StudentSocialParticipation;
