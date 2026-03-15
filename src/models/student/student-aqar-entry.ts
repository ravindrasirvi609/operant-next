import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IStudentAqarEntry extends Document {
    aqarReportId: Types.ObjectId;
    studentId: Types.ObjectId;
    academicScore: number;
    activitiesScore: number;
    researchScore: number;
    sportsScore: number;
    socialScore: number;
    overallScore: number;
    createdAt: Date;
    updatedAt: Date;
}

const StudentAqarEntrySchema = new Schema<IStudentAqarEntry>(
    {
        aqarReportId: { type: Schema.Types.ObjectId, ref: "AqarReport", required: true, index: true },
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
        academicScore: { type: Number, default: 0, min: 0 },
        activitiesScore: { type: Number, default: 0, min: 0 },
        researchScore: { type: Number, default: 0, min: 0 },
        sportsScore: { type: Number, default: 0, min: 0 },
        socialScore: { type: Number, default: 0, min: 0 },
        overallScore: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true, collection: "student_aqar_entries" }
);

StudentAqarEntrySchema.index({ aqarReportId: 1, studentId: 1 }, { unique: true });

const StudentAqarEntry: Model<IStudentAqarEntry> =
    mongoose.models.StudentAqarEntry ||
    mongoose.model<IStudentAqarEntry>("StudentAqarEntry", StudentAqarEntrySchema);

export default StudentAqarEntry;
