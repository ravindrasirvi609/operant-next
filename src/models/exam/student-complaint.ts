import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudentComplaint extends Document {
    noOfStudents?: string;
    noOfGrievances?: string;
    academicYear: string;
    proof?: string;
    createdAt: Date;
    updatedAt: Date;
}

const StudentComplaintSchema = new Schema<IStudentComplaint>(
    {
        noOfStudents: {
            type: String,
        },
        noOfGrievances: {
            type: String,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        proof: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "studentcomplaintsgrevancess",
    }
);

const StudentComplaint: Model<IStudentComplaint> =
    mongoose.models.StudentComplaint ||
    mongoose.model<IStudentComplaint>(
        "StudentComplaint",
        StudentComplaintSchema
    );

export default StudentComplaint;
