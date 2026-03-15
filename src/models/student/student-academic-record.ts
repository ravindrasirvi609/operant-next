import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IStudentAcademicRecord extends Document {
    studentId: Types.ObjectId;
    semesterId: Types.ObjectId;
    sgpa?: number;
    cgpa?: number;
    percentage?: number;
    rank?: number;
    resultStatus?: "Pass" | "Fail" | "Promoted" | "Withheld";
    createdAt: Date;
    updatedAt: Date;
}

const StudentAcademicRecordSchema = new Schema<IStudentAcademicRecord>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
        semesterId: { type: Schema.Types.ObjectId, ref: "Semester", required: true, index: true },
        sgpa: { type: Number, min: 0, max: 10 },
        cgpa: { type: Number, min: 0, max: 10 },
        percentage: { type: Number, min: 0, max: 100 },
        rank: { type: Number, min: 1 },
        resultStatus: { type: String, enum: ["Pass", "Fail", "Promoted", "Withheld"] },
    },
    { timestamps: true, collection: "student_academic_records" }
);

StudentAcademicRecordSchema.index({ studentId: 1, semesterId: 1 }, { unique: true });

const StudentAcademicRecord: Model<IStudentAcademicRecord> =
    mongoose.models.StudentAcademicRecord ||
    mongoose.model<IStudentAcademicRecord>("StudentAcademicRecord", StudentAcademicRecordSchema);

export default StudentAcademicRecord;
