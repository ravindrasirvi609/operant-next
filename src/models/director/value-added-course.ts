import mongoose, { Schema, Document, Model } from "mongoose";

export interface IValueAddedCourse extends Document {
    nameOfValueAddedCourse: string;
    courseCode?: string;
    academicYear: string;
    yearOfOffering: number;
    programName: string;
    noOfTimesOfferedDuringSameYear: number;
    durationOfCourse: number;
    numberOfStudentsEnrolled: number;
    numberOfStudentsCompletingCourse: number;
    uploadProof?: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const ValueAddedCourseSchema = new Schema<IValueAddedCourse>(
    {
        nameOfValueAddedCourse: {
            type: String,
            required: [true, "Course name is required"],
            trim: true,
        },
        courseCode: {
            type: String,
            trim: true,
            uppercase: true,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        yearOfOffering: {
            type: Number,
            required: [true, "Year of offering is required"],
        },
        programName: {
            type: String,
            required: [true, "Program name is required"],
            trim: true,
        },
        noOfTimesOfferedDuringSameYear: {
            type: Number,
            required: [true, "Number of times offered is required"],
        },
        durationOfCourse: {
            type: Number,
            required: [true, "Duration is required"],
        },
        numberOfStudentsEnrolled: {
            type: Number,
            required: [true, "Number of students enrolled is required"],
        },
        numberOfStudentsCompletingCourse: {
            type: Number,
            required: [true, "Number of students completing is required"],
        },
        uploadProof: {
            type: String,
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
        collection: "valueaddedcources", // preserving original collection name
    }
);

const ValueAddedCourse: Model<IValueAddedCourse> =
    mongoose.models.ValueAddedCourse ||
    mongoose.model<IValueAddedCourse>("ValueAddedCourse", ValueAddedCourseSchema);

export default ValueAddedCourse;
