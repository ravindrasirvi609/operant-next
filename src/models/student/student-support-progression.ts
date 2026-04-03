import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const studentSupportProgressionTypeValues = [
    "Placement",
    "HigherStudies",
    "Entrepreneurship",
    "CompetitiveExam",
    "Internship",
    "Other",
] as const;

export const studentSupportProgressionStatusValues = [
    "Placed",
    "Admitted",
    "Qualified",
    "Progressing",
    "Completed",
    "Other",
] as const;

export type StudentSupportProgressionType =
    (typeof studentSupportProgressionTypeValues)[number];
export type StudentSupportProgressionStatus =
    (typeof studentSupportProgressionStatusValues)[number];

export interface IStudentSupportProgression extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    progressionType: StudentSupportProgressionType;
    title: string;
    batchLabel?: string;
    programName?: string;
    destinationName?: string;
    studentCount?: number;
    medianPackageLpa?: number;
    status: StudentSupportProgressionStatus;
    remarks?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const StudentSupportProgressionSchema = new Schema<IStudentSupportProgression>(
    {
        planId: {
            type: Schema.Types.ObjectId,
            ref: "StudentSupportGovernancePlan",
            required: true,
            index: true,
        },
        assignmentId: {
            type: Schema.Types.ObjectId,
            ref: "StudentSupportGovernanceAssignment",
            required: true,
            index: true,
        },
        progressionType: {
            type: String,
            enum: studentSupportProgressionTypeValues,
            required: true,
            default: "Placement",
            index: true,
        },
        title: { type: String, required: true, trim: true },
        batchLabel: { type: String, trim: true },
        programName: { type: String, trim: true },
        destinationName: { type: String, trim: true },
        studentCount: { type: Number, min: 0 },
        medianPackageLpa: { type: Number, min: 0 },
        status: {
            type: String,
            enum: studentSupportProgressionStatusValues,
            required: true,
            default: "Placed",
            index: true,
        },
        remarks: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "student_support_progressions" }
);

StudentSupportProgressionSchema.index(
    { assignmentId: 1, displayOrder: 1, progressionType: 1, title: 1 }
);

const StudentSupportProgression: Model<IStudentSupportProgression> =
    mongoose.models.StudentSupportProgression ||
    mongoose.model<IStudentSupportProgression>(
        "StudentSupportProgression",
        StudentSupportProgressionSchema
    );

export default StudentSupportProgression;
