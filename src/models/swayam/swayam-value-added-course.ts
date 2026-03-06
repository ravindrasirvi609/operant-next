import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISwayamValueAddedCourse extends Document {
    nameOfProgram: string;
    programCode: string;
    modeOfCourse: string;
    yearOfOffering: string;
    contactHours: string;
    studentsEnrolled: number;
    studentsCompleting: number;
    academicYear: string;
    proof?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SwayamValueAddedCourseSchema = new Schema<ISwayamValueAddedCourse>(
    {
        nameOfProgram: {
            type: String,
            required: [true, "Program name is required"],
            trim: true,
        },
        programCode: {
            type: String,
            required: [true, "Program code is required"],
            trim: true,
        },
        modeOfCourse: {
            type: String,
            required: [true, "Mode of course is required"],
        },
        yearOfOffering: {
            type: String,
            required: [true, "Year of offering is required"],
        },
        contactHours: {
            type: String,
            required: [true, "Contact hours is required"],
        },
        studentsEnrolled: {
            type: Number,
            required: [true, "Number of students enrolled is required"],
        },
        studentsCompleting: {
            type: Number,
            required: [true, "Number of students completing is required"],
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        proof: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "swayamvalueaddedcourses",
    }
);

const SwayamValueAddedCourse: Model<ISwayamValueAddedCourse> =
    mongoose.models.SwayamValueAddedCourse ||
    mongoose.model<ISwayamValueAddedCourse>(
        "SwayamValueAddedCourse",
        SwayamValueAddedCourseSchema
    );

export default SwayamValueAddedCourse;
