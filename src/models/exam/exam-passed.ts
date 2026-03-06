import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExamPassed extends Document {
    programCode: string;
    programName: string;
    studentsAppeared: string;
    studentsPassed: string;
    academicYear: string;
    createdAt: Date;
    updatedAt: Date;
}

const ExamPassedSchema = new Schema<IExamPassed>(
    {
        programCode: {
            type: String,
            required: [true, "Program code is required"],
            trim: true,
            uppercase: true,
        },
        programName: {
            type: String,
            required: [true, "Program name is required"],
            trim: true,
        },
        studentsAppeared: {
            type: String,
            required: [true, "Students appeared is required"],
        },
        studentsPassed: {
            type: String,
            required: [true, "Students passed is required"],
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "exampassedduringyears",
    }
);

const ExamPassed: Model<IExamPassed> =
    mongoose.models.ExamPassed ||
    mongoose.model<IExamPassed>("ExamPassed", ExamPassedSchema);

export default ExamPassed;
