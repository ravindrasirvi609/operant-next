import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQualifiedExam extends Document {
    academicYear?: string;
    registrationNumberRollNumber: string;
    namesOfStudentsSelectedQualified: string;
    nameOfExam?: string;
    uploadProof?: string;
    schoolName: string;
    alumniId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const QualifiedExamSchema = new Schema<IQualifiedExam>(
    {
        academicYear: {
            type: String,
            index: true,
        },
        registrationNumberRollNumber: {
            type: String,
            required: [true, "Registration/Roll number is required"],
            trim: true,
        },
        namesOfStudentsSelectedQualified: {
            type: String,
            required: [true, "Student name is required"],
            trim: true,
        },
        nameOfExam: {
            type: String,
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
        alumniId: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: "qualifiedexams",
    }
);

const QualifiedExam: Model<IQualifiedExam> =
    mongoose.models.QualifiedExam ||
    mongoose.model<IQualifiedExam>("QualifiedExam", QualifiedExamSchema);

export default QualifiedExam;
