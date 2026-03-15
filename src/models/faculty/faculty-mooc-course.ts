import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFacultyMoocCourse extends Document {
    facultyId: Types.ObjectId;
    courseName: string;
    platform: string;
    university?: string;
    durationWeeks?: number;
    grade?: string;
    certificateDocumentId?: Types.ObjectId;
    completionDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyMoocCourseSchema = new Schema<IFacultyMoocCourse>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        courseName: { type: String, required: true, trim: true },
        platform: { type: String, required: true, trim: true, index: true },
        university: { type: String, trim: true },
        durationWeeks: { type: Number },
        grade: { type: String, trim: true },
        certificateDocumentId: { type: Schema.Types.ObjectId, ref: "Document" },
        completionDate: { type: Date, required: true, index: true },
    },
    { timestamps: true, collection: "faculty_mooc_courses" }
);

FacultyMoocCourseSchema.index({ facultyId: 1, completionDate: -1 });

const FacultyMoocCourse: Model<IFacultyMoocCourse> =
    mongoose.models.FacultyMoocCourse ||
    mongoose.model<IFacultyMoocCourse>("FacultyMoocCourse", FacultyMoocCourseSchema);

export default FacultyMoocCourse;

