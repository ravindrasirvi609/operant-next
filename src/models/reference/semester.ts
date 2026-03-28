import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISemester extends Document {
    semesterNumber: number;
    createdAt: Date;
    updatedAt: Date;
}

const SemesterSchema = new Schema<ISemester>(
    {
        semesterNumber: { type: Number, required: true, min: 1 },
    },
    { timestamps: true, collection: "semesters" }
);

SemesterSchema.index({ semesterNumber: 1 }, { unique: true });

const Semester: Model<ISemester> =
    mongoose.models.Semester ||
    mongoose.model<ISemester>("Semester", SemesterSchema);

export default Semester;
