import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IStudentSupportMentorGroup extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    groupName: string;
    programName?: string;
    batchLabel?: string;
    mentorName?: string;
    menteeCount?: number;
    meetingCount?: number;
    supportThemes?: string;
    escalatedCount?: number;
    actionTaken?: string;
    remarks?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const StudentSupportMentorGroupSchema = new Schema<IStudentSupportMentorGroup>(
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
        groupName: { type: String, required: true, trim: true },
        programName: { type: String, trim: true },
        batchLabel: { type: String, trim: true },
        mentorName: { type: String, trim: true },
        menteeCount: { type: Number, min: 0 },
        meetingCount: { type: Number, min: 0 },
        supportThemes: { type: String, trim: true },
        escalatedCount: { type: Number, min: 0 },
        actionTaken: { type: String, trim: true },
        remarks: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "student_support_mentor_groups" }
);

StudentSupportMentorGroupSchema.index({ assignmentId: 1, displayOrder: 1, groupName: 1 });

const StudentSupportMentorGroup: Model<IStudentSupportMentorGroup> =
    mongoose.models.StudentSupportMentorGroup ||
    mongoose.model<IStudentSupportMentorGroup>(
        "StudentSupportMentorGroup",
        StudentSupportMentorGroupSchema
    );

export default StudentSupportMentorGroup;
