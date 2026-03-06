import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAlumniContribution extends Document {
    nameOfAlumniContributed: string;
    programGraduatedFrom: string;
    amountOfContribution: number;
    uploadProof?: string;
    academicYear: string;
    schoolName: string;
    alumniId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const AlumniContributionSchema = new Schema<IAlumniContribution>(
    {
        nameOfAlumniContributed: {
            type: String,
            required: [true, "Alumni name is required"],
            trim: true,
        },
        programGraduatedFrom: {
            type: String,
            required: [true, "Program graduated from is required"],
            trim: true,
        },
        amountOfContribution: {
            type: Number,
            required: [true, "Contribution amount is required"],
            min: [0, "Cannot be negative"],
        },
        uploadProof: {
            type: String,
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
        alumniId: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: "alumnicontributions",
    }
);

const AlumniContribution: Model<IAlumniContribution> =
    mongoose.models.AlumniContribution ||
    mongoose.model<IAlumniContribution>(
        "AlumniContribution",
        AlumniContributionSchema
    );

export default AlumniContribution;
