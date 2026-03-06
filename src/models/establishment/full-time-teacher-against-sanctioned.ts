import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFullTimeTeacherAgainstSanctioned extends Document {
    name: string;
    pan: string;
    designation: string;
    yearOfAppointment: number;
    natureOfAppointment: string;
    departmentName: string;
    experienceInYears: number;
    stillWorking: string;
    academicYear: string;
    createdAt: Date;
    updatedAt: Date;
}

const FullTimeTeacherAgainstSanctionedSchema = new Schema<IFullTimeTeacherAgainstSanctioned>(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        pan: {
            type: String,
            required: [true, "PAN is required"],
            uppercase: true,
            trim: true,
        },
        designation: {
            type: String,
            required: [true, "Designation is required"],
            trim: true,
        },
        yearOfAppointment: {
            type: Number,
            required: [true, "Year of appointment is required"],
        },
        natureOfAppointment: {
            type: String,
            required: [true, "Nature of appointment is required"],
        },
        departmentName: {
            type: String,
            required: [true, "Department name is required"],
            trim: true,
        },
        experienceInYears: {
            type: Number,
            required: [true, "Experience is required"],
            min: [0, "Cannot be negative"],
        },
        stillWorking: {
            type: String,
            required: [true, "Still working status is required"],
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "esttfulltimeteacheragainstsanctioneds",
    }
);

const FullTimeTeacherAgainstSanctioned: Model<IFullTimeTeacherAgainstSanctioned> =
    mongoose.models.FullTimeTeacherAgainstSanctioned ||
    mongoose.model<IFullTimeTeacherAgainstSanctioned>(
        "FullTimeTeacherAgainstSanctioned",
        FullTimeTeacherAgainstSanctionedSchema
    );

export default FullTimeTeacherAgainstSanctioned;
