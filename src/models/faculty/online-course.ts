import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IOnlineCourse extends Document {
    teacherAttendedName: string;
    programTitle: string;
    durationFrom?: string;
    durationTo?: string;
    year: string;
    proof?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const OnlineCourseSchema = new Schema<IOnlineCourse>(
    {
        teacherAttendedName: {
            type: String,
            required: [true, "Teacher name is required"],
            trim: true,
        },
        programTitle: {
            type: String,
            required: [true, "Program title is required"],
            trim: true,
        },
        durationFrom: {
            type: String,
        },
        durationTo: {
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
        collection: "onlines", // pluralized from online
    }
);

const OnlineCourse: Model<IOnlineCourse> =
    mongoose.models.OnlineCourse ||
    mongoose.model<IOnlineCourse>("OnlineCourse", OnlineCourseSchema);

export default OnlineCourse;
