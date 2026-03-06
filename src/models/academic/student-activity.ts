import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IStudentActivity extends Document {
    type: 'Placement' | 'HigherEducation' | 'Internship' | 'CompetitiveExam' | 'SkillEnhancement';
    studentName: string;
    companyOrUniversity: string;
    programName?: string;
    packageOrRank?: string;
    year: string;
    outcome?: string;
    uploadProof?: string;

    // Relationships
    userId: Types.ObjectId; // Link to the Student
    schoolName: string;

    createdAt: Date;
    updatedAt: Date;
}

const StudentActivitySchema = new Schema<IStudentActivity>(
    {
        type: {
            type: String,
            required: true,
            enum: ['Placement', 'HigherEducation', 'Internship', 'CompetitiveExam', 'SkillEnhancement'],
            index: true
        },
        studentName: { type: String, required: true, trim: true },
        companyOrUniversity: { type: String, required: true, trim: true },
        programName: { type: String },
        packageOrRank: { type: String },
        year: { type: String, required: true, index: true },
        outcome: { type: String },
        uploadProof: { type: String },

        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        schoolName: { type: String, required: true, index: true },
    },
    { timestamps: true }
);

const StudentActivity: Model<IStudentActivity> =
    mongoose.models.StudentActivity ||
    mongoose.model<IStudentActivity>("StudentActivity", StudentActivitySchema);

export default StudentActivity;
