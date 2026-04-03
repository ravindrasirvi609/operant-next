import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const studentSupportGrievanceCategoryValues = [
    "Academic",
    "Administrative",
    "Scholarship",
    "Examination",
    "Hostel",
    "Infrastructure",
    "AntiRagging",
    "Harassment",
    "Wellbeing",
    "Other",
] as const;

export const studentSupportGrievanceStatusValues = [
    "Open",
    "InProgress",
    "Resolved",
    "Escalated",
    "Closed",
] as const;

export const studentSupportGrievanceLodgedByValues = [
    "Student",
    "Parent",
    "Group",
    "Anonymous",
] as const;

export type StudentSupportGrievanceCategory =
    (typeof studentSupportGrievanceCategoryValues)[number];
export type StudentSupportGrievanceStatus =
    (typeof studentSupportGrievanceStatusValues)[number];
export type StudentSupportGrievanceLodgedBy =
    (typeof studentSupportGrievanceLodgedByValues)[number];

export interface IStudentSupportGrievance extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    category: StudentSupportGrievanceCategory;
    referenceNumber?: string;
    lodgedByType: StudentSupportGrievanceLodgedBy;
    receivedDate?: Date;
    resolvedDate?: Date;
    status: StudentSupportGrievanceStatus;
    resolutionDays?: number;
    committeeName?: string;
    resolutionSummary?: string;
    remarks?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const StudentSupportGrievanceSchema = new Schema<IStudentSupportGrievance>(
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
        category: {
            type: String,
            enum: studentSupportGrievanceCategoryValues,
            required: true,
            default: "Academic",
            index: true,
        },
        referenceNumber: { type: String, trim: true },
        lodgedByType: {
            type: String,
            enum: studentSupportGrievanceLodgedByValues,
            required: true,
            default: "Student",
        },
        receivedDate: { type: Date },
        resolvedDate: { type: Date },
        status: {
            type: String,
            enum: studentSupportGrievanceStatusValues,
            required: true,
            default: "Open",
            index: true,
        },
        resolutionDays: { type: Number, min: 0 },
        committeeName: { type: String, trim: true },
        resolutionSummary: { type: String, trim: true },
        remarks: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "student_support_grievances" }
);

StudentSupportGrievanceSchema.index({ assignmentId: 1, displayOrder: 1, category: 1 });

const StudentSupportGrievance: Model<IStudentSupportGrievance> =
    mongoose.models.StudentSupportGrievance ||
    mongoose.model<IStudentSupportGrievance>(
        "StudentSupportGrievance",
        StudentSupportGrievanceSchema
    );

export default StudentSupportGrievance;
