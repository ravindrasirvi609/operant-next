import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProgressionToHE extends Document {
    nameOfStudentEnrolling: string;
    programGraduatedFrom?: string;
    nameOfInstitutionAdmitted: string;
    nameOfProgrammeAdmitted: string;
    academicYear?: string;
    uploadProof?: string;
    otherUser?: string;
    schoolName: string;
    alumniId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ProgressionToHESchema = new Schema<IProgressionToHE>(
    {
        nameOfStudentEnrolling: {
            type: String,
            required: [true, "Student name is required"],
            trim: true,
        },
        programGraduatedFrom: {
            type: String,
            trim: true,
        },
        nameOfInstitutionAdmitted: {
            type: String,
            required: [true, "Institution name is required"],
            trim: true,
        },
        nameOfProgrammeAdmitted: {
            type: String,
            required: [true, "Program admitted name is required"],
            trim: true,
        },
        academicYear: {
            type: String,
            index: true,
        },
        uploadProof: {
            type: String,
        },
        otherUser: {
            type: String,
            trim: true,
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
        collection: "progressiontohes",
    }
);

const ProgressionToHE: Model<IProgressionToHE> =
    mongoose.models.ProgressionToHE ||
    mongoose.model<IProgressionToHE>("ProgressionToHE", ProgressionToHESchema);

export default ProgressionToHE;
