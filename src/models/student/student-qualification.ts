import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudentQualification extends Document {
    program?: string;
    institutionBoard: string;
    percentage: number;
    startYear: string;
    year: string;
    programType: string;
    school?: string;
    isStudied: boolean;
    uploadProof?: string;
    userId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const StudentQualificationSchema = new Schema<IStudentQualification>(
    {
        program: {
            type: String,
            trim: true,
        },
        institutionBoard: {
            type: String,
            required: [true, "Institution/Board is required"],
            trim: true,
        },
        percentage: {
            type: Number,
            required: [true, "Percentage is required"],
        },
        startYear: {
            type: String,
            required: [true, "Start year is required"],
        },
        year: {
            type: String,
            required: [true, "Completion year is required"],
        },
        programType: {
            type: String,
            required: [true, "Program type is required"],
        },
        school: {
            type: String,
            trim: true,
        },
        isStudied: {
            type: Boolean,
            required: [true, "isStudied status is required"],
        },
        uploadProof: {
            type: String,
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: [true, "User reference is required"],
            ref: "StudentUser",
        },
    },
    {
        timestamps: true,
        collection: "studentqualifications",
    }
);

const StudentQualification: Model<IStudentQualification> =
    mongoose.models.StudentQualification ||
    mongoose.model<IStudentQualification>(
        "StudentQualification",
        StudentQualificationSchema
    );

export default StudentQualification;
