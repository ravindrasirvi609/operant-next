import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const curriculumValueAddedCourseStatusValues = [
    "Draft",
    "Active",
    "Completed",
    "Archived",
] as const;

export type CurriculumValueAddedCourseStatus =
    (typeof curriculumValueAddedCourseStatusValues)[number];

export interface ICurriculumValueAddedCourse extends Document {
    departmentId: Types.ObjectId;
    academicYearId?: Types.ObjectId;
    title: string;
    courseCode?: string;
    credits: number;
    contactHours: number;
    coordinatorUserId?: Types.ObjectId;
    startDate?: Date;
    endDate?: Date;
    status: CurriculumValueAddedCourseStatus;
    description?: string;
    documentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CurriculumValueAddedCourseSchema = new Schema<ICurriculumValueAddedCourse>(
    {
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", index: true },
        title: { type: String, required: true, trim: true },
        courseCode: { type: String, trim: true, uppercase: true },
        credits: { type: Number, required: true, min: 0, default: 0 },
        contactHours: { type: Number, required: true, min: 0, default: 0 },
        coordinatorUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
        startDate: { type: Date },
        endDate: { type: Date },
        status: {
            type: String,
            enum: curriculumValueAddedCourseStatusValues,
            required: true,
            default: "Draft",
            index: true,
        },
        description: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "value_added_courses" }
);

CurriculumValueAddedCourseSchema.index(
    { departmentId: 1, academicYearId: 1, title: 1 },
    { unique: true }
);

const CurriculumValueAddedCourse: Model<ICurriculumValueAddedCourse> =
    mongoose.models.CurriculumValueAddedCourse ||
    mongoose.model<ICurriculumValueAddedCourse>(
        "CurriculumValueAddedCourse",
        CurriculumValueAddedCourseSchema
    );

export default CurriculumValueAddedCourse;
