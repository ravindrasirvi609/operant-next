import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ISemester extends Document {
    programId: Types.ObjectId;
    semesterNumber: number;
    academicYearId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const SemesterSchema = new Schema<ISemester>(
    {
        programId: { type: Schema.Types.ObjectId, ref: "Program", required: true, index: true },
        semesterNumber: { type: Number, required: true, min: 1 },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
    },
    { timestamps: true, collection: "semesters" }
);

SemesterSchema.index({ programId: 1, academicYearId: 1, semesterNumber: 1 }, { unique: true });

const Semester: Model<ISemester> =
    mongoose.models.Semester ||
    mongoose.model<ISemester>("Semester", SemesterSchema);

export default Semester;
