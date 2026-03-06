import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICourseInProgram extends Document {
    programName: string;
    programCode: string;
    courseCode: string;
    courseName: string;
    academicYear: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const CourseInProgramSchema = new Schema<ICourseInProgram>(
    {
        programName: {
            type: String,
            required: [true, "Program name is required"],
            trim: true,
        },
        programCode: {
            type: String,
            required: [true, "Program code is required"],
            trim: true,
            uppercase: true,
        },
        courseCode: {
            type: String,
            required: [true, "Course code is required"],
            trim: true,
            uppercase: true,
        },
        courseName: {
            type: String,
            required: [true, "Course name is required"],
            trim: true,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "coursesinallprograms", // preserving original collection name
    }
);

const CourseInProgram: Model<ICourseInProgram> =
    mongoose.models.CourseInProgram ||
    mongoose.model<ICourseInProgram>("CourseInProgram", CourseInProgramSchema);

export default CourseInProgram;
