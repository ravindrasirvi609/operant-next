import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFacultyTeachingLoad extends Document {
    facultyId: Types.ObjectId;
    academicYearId: Types.ObjectId;
    programId: Types.ObjectId;
    documentId?: Types.ObjectId;
    courseName: string;
    semester: number;
    subjectCode?: string;
    lectureHours: number;
    tutorialHours: number;
    practicalHours: number;
    totalHours: number;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyTeachingLoadSchema = new Schema<IFacultyTeachingLoad>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
        programId: { type: Schema.Types.ObjectId, ref: "Program", required: true, index: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        courseName: { type: String, required: true, trim: true },
        semester: { type: Number, required: true, min: 1 },
        subjectCode: { type: String, trim: true },
        lectureHours: { type: Number, min: 0, default: 0 },
        tutorialHours: { type: Number, min: 0, default: 0 },
        practicalHours: { type: Number, min: 0, default: 0 },
        totalHours: { type: Number, min: 0, default: 0 },
    },
    { timestamps: true, collection: "faculty_teaching_load" }
);

FacultyTeachingLoadSchema.index(
    { facultyId: 1, academicYearId: 1, programId: 1, courseName: 1, semester: 1, subjectCode: 1 },
    { unique: true }
);

const FacultyTeachingLoad: Model<IFacultyTeachingLoad> =
    mongoose.models.FacultyTeachingLoad ||
    mongoose.model<IFacultyTeachingLoad>("FacultyTeachingLoad", FacultyTeachingLoadSchema);

export default FacultyTeachingLoad;
