import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ILecture extends Document {
    course: string;
    level: string;
    teachingMode: string;
    noOfClasses: string;
    classesTaken?: string;
    year: string;
    proof?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const LectureSchema = new Schema<ILecture>(
    {
        course: {
            type: String,
            required: [true, "Course name is required"],
            trim: true,
        },
        level: {
            type: String,
            required: [true, "Level is required"],
        },
        teachingMode: {
            type: String,
            required: [true, "Teaching mode is required"],
        },
        noOfClasses: {
            type: String,
            required: [true, "Number of classes is required"],
        },
        classesTaken: {
            type: String,
        },
        year: {
            type: String,
            required: [true, "Year is required"],
            index: true,
        },
        proof: {
            type: String,
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "FacultyUser",
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "lectures",
    }
);

const Lecture: Model<ILecture> =
    mongoose.models.Lecture || mongoose.model<ILecture>("Lecture", LectureSchema);

export default Lecture;
