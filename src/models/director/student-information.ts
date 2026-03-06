import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudentInformation extends Document {
    studentData: Record<string, any>;
    totalValues: Record<string, any>;
    year: string;
    schoolName: string;
    createdAt: Date;
    updatedAt: Date;
}

const StudentInformationSchema = new Schema<IStudentInformation>(
    {
        studentData: {
            type: Object,
            required: [true, "Student data is required"],
        },
        totalValues: {
            type: Object,
            required: [true, "Total values are required"],
        },
        year: {
            type: String,
            required: [true, "Year is required"],
            index: true,
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
        collection: "studentinformations",
    }
);

const StudentInformation: Model<IStudentInformation> =
    mongoose.models.StudentInformation ||
    mongoose.model<IStudentInformation>(
        "StudentInformation",
        StudentInformationSchema
    );

export default StudentInformation;
