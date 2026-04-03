import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ICurriculumBosMeeting extends Document {
    departmentId: Types.ObjectId;
    academicYearId?: Types.ObjectId;
    title: string;
    meetingDate: Date;
    agenda?: string;
    minutesDocumentId?: Types.ObjectId;
    createdBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CurriculumBosMeetingSchema = new Schema<ICurriculumBosMeeting>(
    {
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", index: true },
        title: { type: String, required: true, trim: true },
        meetingDate: { type: Date, required: true, index: true },
        agenda: { type: String, trim: true },
        minutesDocumentId: { type: Schema.Types.ObjectId, ref: "Document" },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true, collection: "bos_meetings" }
);

CurriculumBosMeetingSchema.index({ departmentId: 1, meetingDate: 1, title: 1 }, { unique: true });

const CurriculumBosMeeting: Model<ICurriculumBosMeeting> =
    mongoose.models.CurriculumBosMeeting ||
    mongoose.model<ICurriculumBosMeeting>("CurriculumBosMeeting", CurriculumBosMeetingSchema);

export default CurriculumBosMeeting;
