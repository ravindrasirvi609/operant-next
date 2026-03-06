import mongoose, { Schema, Document, Model } from "mongoose";

export interface IScholarship extends Document {
    academicYear: string;
    name: string;
    governmentStudents: string;
    governmentAmount: number;
    institutionStudents: string;
    institutionAmount: number;
    nonGovernmentStudents: string;
    nonGovernmentAmount: number;
    nonGovernmentNgo: string;
    proof?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ScholarshipSchema = new Schema<IScholarship>(
    {
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        name: {
            type: String,
            required: [true, "Scholarship name is required"],
            trim: true,
        },
        governmentStudents: {
            type: String,
            required: [true, "Government students info is required"],
        },
        governmentAmount: {
            type: Number,
            required: [true, "Government amount is required"],
        },
        institutionStudents: {
            type: String,
            required: [true, "Institution students info is required"],
        },
        institutionAmount: {
            type: Number,
            required: [true, "Institution amount is required"],
        },
        nonGovernmentStudents: {
            type: String,
            required: [true, "Non-government students info is required"],
        },
        nonGovernmentAmount: {
            type: Number,
            required: [true, "Non-government amount is required"],
        },
        nonGovernmentNgo: {
            type: String,
            required: [true, "Non-government NGO info is required"],
        },
        proof: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "scholarships",
    }
);

const Scholarship: Model<IScholarship> =
    mongoose.models.Scholarship ||
    mongoose.model<IScholarship>("Scholarship", ScholarshipSchema);

export default Scholarship;
