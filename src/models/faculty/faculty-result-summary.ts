import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFacultyResultSummary extends Document {
    facultyId: Types.ObjectId;
    academicYearId: Types.ObjectId;
    subjectName: string;
    appearedStudents: number;
    passedStudents: number;
    resultPercentage: number;
    universityRankStudents: number;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyResultSummarySchema = new Schema<IFacultyResultSummary>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
        subjectName: { type: String, required: true, trim: true },
        appearedStudents: { type: Number, min: 0, default: 0 },
        passedStudents: { type: Number, min: 0, default: 0 },
        resultPercentage: { type: Number, min: 0, max: 100, default: 0 },
        universityRankStudents: { type: Number, min: 0, default: 0 },
    },
    { timestamps: true, collection: "faculty_result_summary" }
);

FacultyResultSummarySchema.index({ facultyId: 1, academicYearId: 1, subjectName: 1 }, { unique: true });

const FacultyResultSummary: Model<IFacultyResultSummary> =
    mongoose.models.FacultyResultSummary ||
    mongoose.model<IFacultyResultSummary>("FacultyResultSummary", FacultyResultSummarySchema);

export default FacultyResultSummary;
