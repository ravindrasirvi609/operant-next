import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISyllabusRevision extends Document {
    programCode: string;
    programName: string;
    academicYear: string;
    yearOfIntroduction: number;
    statusOfImplementation: string;
    yearOfImplementation: number;
    yearOfRevision: number;
    percentageOfContentAddedOrReplaced: number;
    uploadProof?: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const SyllabusRevisionSchema = new Schema<ISyllabusRevision>(
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
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        yearOfIntroduction: {
            type: Number,
            required: [true, "Year of introduction is required"],
        },
        statusOfImplementation: {
            type: String,
            required: [true, "Status of implementation is required"],
        },
        yearOfImplementation: {
            type: Number,
            required: [true, "Year of implementation is required"],
        },
        yearOfRevision: {
            type: Number,
            required: [true, "Year of revision is required"],
        },
        percentageOfContentAddedOrReplaced: {
            type: Number,
            required: [true, "Percentage of content is required"],
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
        collection: "syllabusrevisions",
    }
);

const SyllabusRevision: Model<ISyllabusRevision> =
    mongoose.models.SyllabusRevision ||
    mongoose.model<ISyllabusRevision>("SyllabusRevision", SyllabusRevisionSchema);

export default SyllabusRevision;
