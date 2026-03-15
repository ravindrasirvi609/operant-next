import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFacultyTeachingSummary extends Document {
    facultyId: Types.ObjectId;
    academicYearId: Types.ObjectId;
    classesTaken: number;
    coursePreparationHours: number;
    coursesTaught: string[];
    mentoringCount: number;
    labSupervisionCount: number;
    feedbackSummary?: string;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyTeachingSummarySchema = new Schema<IFacultyTeachingSummary>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
        classesTaken: { type: Number, min: 0, default: 0 },
        coursePreparationHours: { type: Number, min: 0, default: 0 },
        coursesTaught: { type: [String], default: [] },
        mentoringCount: { type: Number, min: 0, default: 0 },
        labSupervisionCount: { type: Number, min: 0, default: 0 },
        feedbackSummary: { type: String, trim: true },
    },
    { timestamps: true, collection: "faculty_teaching_summary" }
);

FacultyTeachingSummarySchema.index({ facultyId: 1, academicYearId: 1 }, { unique: true });

const FacultyTeachingSummary: Model<IFacultyTeachingSummary> =
    mongoose.models.FacultyTeachingSummary ||
    mongoose.model<IFacultyTeachingSummary>("FacultyTeachingSummary", FacultyTeachingSummarySchema);

export default FacultyTeachingSummary;
