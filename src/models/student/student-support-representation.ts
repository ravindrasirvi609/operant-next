import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const studentSupportRepresentationTypeValues = [
    "StudentCouncil",
    "ClassRepresentative",
    "Committee",
    "Club",
    "QualityCircle",
    "FeedbackForum",
    "AntiRaggingCell",
    "Other",
] as const;

export type StudentSupportRepresentationType =
    (typeof studentSupportRepresentationTypeValues)[number];

export interface IStudentSupportRepresentation extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    representationType: StudentSupportRepresentationType;
    bodyName: string;
    roleTitle?: string;
    studentCount?: number;
    meetingCount?: number;
    outcomeSummary?: string;
    remarks?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const StudentSupportRepresentationSchema = new Schema<IStudentSupportRepresentation>(
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
        representationType: {
            type: String,
            enum: studentSupportRepresentationTypeValues,
            required: true,
            default: "StudentCouncil",
            index: true,
        },
        bodyName: { type: String, required: true, trim: true },
        roleTitle: { type: String, trim: true },
        studentCount: { type: Number, min: 0 },
        meetingCount: { type: Number, min: 0 },
        outcomeSummary: { type: String, trim: true },
        remarks: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "student_support_representations" }
);

StudentSupportRepresentationSchema.index(
    { assignmentId: 1, displayOrder: 1, representationType: 1, bodyName: 1 }
);

const StudentSupportRepresentation: Model<IStudentSupportRepresentation> =
    mongoose.models.StudentSupportRepresentation ||
    mongoose.model<IStudentSupportRepresentation>(
        "StudentSupportRepresentation",
        StudentSupportRepresentationSchema
    );

export default StudentSupportRepresentation;
