import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAcademicRecordChangeSet {
    sgpa?: number;
    cgpa?: number;
    percentage?: number;
    rank?: number;
    resultStatus?: "Pass" | "Fail" | "Promoted" | "Withheld";
}

export interface IStudentAcademicRecordEditRequest extends Document {
    studentId: Types.ObjectId;
    academicRecordId: Types.ObjectId;
    semesterId: Types.ObjectId;
    requestedChanges: IAcademicRecordChangeSet;
    previousValues: IAcademicRecordChangeSet;
    reason: string;
    status: "Pending" | "Approved" | "Rejected";
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;
    reviewRemarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const AcademicRecordChangeSetSchema = new Schema<IAcademicRecordChangeSet>(
    {
        sgpa: { type: Number, min: 0, max: 10 },
        cgpa: { type: Number, min: 0, max: 10 },
        percentage: { type: Number, min: 0, max: 100 },
        rank: { type: Number, min: 1 },
        resultStatus: { type: String, enum: ["Pass", "Fail", "Promoted", "Withheld"] },
    },
    { _id: false }
);

const StudentAcademicRecordEditRequestSchema = new Schema<IStudentAcademicRecordEditRequest>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
        academicRecordId: {
            type: Schema.Types.ObjectId,
            ref: "StudentAcademicRecord",
            required: true,
            index: true,
        },
        semesterId: { type: Schema.Types.ObjectId, ref: "Semester", required: true },
        requestedChanges: { type: AcademicRecordChangeSetSchema, required: true },
        previousValues: { type: AcademicRecordChangeSetSchema, required: true },
        reason: { type: String, required: true, trim: true },
        status: {
            type: String,
            required: true,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Pending",
            index: true,
        },
        reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
        reviewedAt: { type: Date },
        reviewRemarks: { type: String, trim: true },
    },
    { timestamps: true, collection: "student_academic_record_edit_requests" }
);

// Only one open correction request per academic record at a time.
StudentAcademicRecordEditRequestSchema.index(
    { academicRecordId: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: "Pending" } }
);

const StudentAcademicRecordEditRequest: Model<IStudentAcademicRecordEditRequest> =
    mongoose.models.StudentAcademicRecordEditRequest ||
    mongoose.model<IStudentAcademicRecordEditRequest>(
        "StudentAcademicRecordEditRequest",
        StudentAcademicRecordEditRequestSchema
    );

export default StudentAcademicRecordEditRequest;
