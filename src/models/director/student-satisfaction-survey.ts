import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudentSatisfactionSurvey extends Document {
    nameOfStudent: string;
    yearOfJoining: string;
    category: string;
    stateOfDomicile: string;
    nationality?: string;
    emailId: string;
    programmeName: string;
    studentUniqueEnrolmentId: string;
    mobileNumber: number;
    gender: string;
    uploadProof?: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const StudentSatisfactionSurveySchema = new Schema<IStudentSatisfactionSurvey>(
    {
        nameOfStudent: {
            type: String,
            required: [true, "Student name is required"],
            trim: true,
        },
        yearOfJoining: {
            type: String,
            required: [true, "Year of joining is required"],
            index: true,
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
        },
        stateOfDomicile: {
            type: String,
            required: [true, "State of domicile is required"],
            trim: true,
        },
        nationality: {
            type: String,
            trim: true,
        },
        emailId: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
        },
        programmeName: {
            type: String,
            required: [true, "Programme name is required"],
            trim: true,
        },
        studentUniqueEnrolmentId: {
            type: String,
            required: [true, "Enrolment ID is required"],
            trim: true,
            unique: true,
        },
        mobileNumber: {
            type: Number,
            required: [true, "Mobile number is required"],
        },
        gender: {
            type: String,
            required: [true, "Gender is required"],
            enum: ["Male", "Female", "Other"],
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
        collection: "studentsatisfactionsurveys",
    }
);

const StudentSatisfactionSurvey: Model<IStudentSatisfactionSurvey> =
    mongoose.models.StudentSatisfactionSurvey ||
    mongoose.model<IStudentSatisfactionSurvey>(
        "StudentSatisfactionSurvey",
        StudentSatisfactionSurveySchema
    );

export default StudentSatisfactionSurvey;
