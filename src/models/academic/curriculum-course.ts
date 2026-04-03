import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const curriculumCourseTypeValues = [
    "Core",
    "Elective",
    "Value Added",
    "Open Elective",
    "Ability Enhancement",
    "Skill Enhancement",
    "Lab",
    "Project",
    "Other",
] as const;

export type CurriculumCourseType = (typeof curriculumCourseTypeValues)[number];

export interface ICurriculumCourse extends Document {
    curriculumId: Types.ObjectId;
    courseId?: Types.ObjectId;
    courseCode: string;
    courseTitle: string;
    courseType: CurriculumCourseType;
    credits: number;
    lectureHours: number;
    tutorialHours: number;
    practicalHours: number;
    semesterNumber: number;
    displayOrder: number;
    facultyOwnerUserId?: Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CurriculumCourseSchema = new Schema<ICurriculumCourse>(
    {
        curriculumId: {
            type: Schema.Types.ObjectId,
            ref: "CurriculumPlan",
            required: true,
            index: true,
        },
        courseId: { type: Schema.Types.ObjectId, ref: "Course", index: true },
        courseCode: { type: String, required: true, trim: true, uppercase: true },
        courseTitle: { type: String, required: true, trim: true },
        courseType: {
            type: String,
            enum: curriculumCourseTypeValues,
            required: true,
            default: "Core",
            index: true,
        },
        credits: { type: Number, required: true, min: 0, default: 0 },
        lectureHours: { type: Number, required: true, min: 0, default: 0 },
        tutorialHours: { type: Number, required: true, min: 0, default: 0 },
        practicalHours: { type: Number, required: true, min: 0, default: 0 },
        semesterNumber: { type: Number, required: true, min: 1, index: true },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
        facultyOwnerUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
        isActive: { type: Boolean, required: true, default: true, index: true },
    },
    { timestamps: true, collection: "curriculum_courses" }
);

CurriculumCourseSchema.index({ curriculumId: 1, courseCode: 1 }, { unique: true });
CurriculumCourseSchema.index({ curriculumId: 1, semesterNumber: 1, displayOrder: 1 });

const CurriculumCourse: Model<ICurriculumCourse> =
    mongoose.models.CurriculumCourse ||
    mongoose.model<ICurriculumCourse>("CurriculumCourse", CurriculumCourseSchema);

export default CurriculumCourse;
