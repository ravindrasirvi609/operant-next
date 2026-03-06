import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmployability extends Document {
    courseCode: string;
    nameOfCourse: string;
    academicYear?: string;
    yearOfIntroduction?: number;
    activitiesContent: string;
    programName: string;
    uploadProof?: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const EmployabilitySchema = new Schema<IEmployability>(
    {
        courseCode: {
            type: String,
            required: [true, "Course code is required"],
            trim: true,
            uppercase: true,
        },
        nameOfCourse: {
            type: String,
            required: [true, "Course name is required"],
            trim: true,
        },
        academicYear: {
            type: String,
            index: true,
        },
        yearOfIntroduction: {
            type: Number,
        },
        activitiesContent: {
            type: String,
            required: [true, "Activities content is required"],
            trim: true,
        },
        programName: {
            type: String,
            required: [true, "Program name is required"],
            trim: true,
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
        collection: "employabilitys", // preserving original collection name
    }
);

const Employability: Model<IEmployability> =
    mongoose.models.Employability ||
    mongoose.model<IEmployability>("Employability", EmployabilitySchema);

export default Employability;
