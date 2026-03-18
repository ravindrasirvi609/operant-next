import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CourseType = "Theory" | "Lab" | "Project" | "Other";

export interface ICourse extends Document {
    name: string;
    subjectCode?: string;
    courseType: CourseType;
    credits: number;
    isActive: boolean;
    programId: Types.ObjectId;
    semesterId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
    {
        name: { type: String, required: true, trim: true, index: true },
        subjectCode: { type: String, trim: true },
        courseType: {
            type: String,
            enum: ["Theory", "Lab", "Project", "Other"],
            default: "Theory",
            index: true,
        },
        credits: { type: Number, min: 0, default: 0 },
        isActive: { type: Boolean, default: true, index: true },
        programId: { type: Schema.Types.ObjectId, ref: "Program", required: true, index: true },
        semesterId: { type: Schema.Types.ObjectId, ref: "Semester", required: true, index: true },
    },
    { timestamps: true, collection: "courses" }
);

CourseSchema.index({ programId: 1, semesterId: 1, name: 1 }, { unique: true });
CourseSchema.index({ programId: 1, subjectCode: 1 }, { unique: true, sparse: true });

const Course: Model<ICourse> =
    mongoose.models.Course || mongoose.model<ICourse>("Course", CourseSchema);

export default Course;
