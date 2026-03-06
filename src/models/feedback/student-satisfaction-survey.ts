import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudentSatisfactionSurvey extends Document {
    academicYear: string;
    schoolName: string;
    response: string;
    createdAt: Date;
    updatedAt: Date;
}

const StudentSatisfactionSurveySchema = new Schema<IStudentSatisfactionSurvey>(
    {
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
        response: {
            type: String,
            required: [true, "Response is required"],
        },
    },
    {
        timestamps: true,
        collection: "feedbackstudentsatisfactionsurveys",
    }
);

const StudentSatisfactionSurvey: Model<IStudentSatisfactionSurvey> =
    mongoose.models.StudentSatisfactionSurvey ||
    mongoose.model<IStudentSatisfactionSurvey>(
        "StudentSatisfactionSurvey",
        StudentSatisfactionSurveySchema
    );

export default StudentSatisfactionSurvey;
