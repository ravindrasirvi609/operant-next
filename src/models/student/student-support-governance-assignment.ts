import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const studentSupportGovernanceWorkflowStatusValues = [
    "Draft",
    "Submitted",
    "Student Support Review",
    "Under Review",
    "Governance Review",
    "Approved",
    "Rejected",
] as const;

export type StudentSupportGovernanceWorkflowStatus =
    (typeof studentSupportGovernanceWorkflowStatusValues)[number];

export interface IStudentSupportGovernanceAssignmentReviewEntry {
    reviewerId?: Types.ObjectId;
    reviewerName?: string;
    reviewerRole?: string;
    stage: string;
    decision: string;
    remarks?: string;
    reviewedAt: Date;
}

export interface IStudentSupportGovernanceAssignmentStatusLog {
    status: StudentSupportGovernanceWorkflowStatus;
    actorId?: Types.ObjectId;
    actorName?: string;
    actorRole?: string;
    remarks?: string;
    changedAt: Date;
}

export interface IStudentSupportGovernanceAssignment extends Document {
    planId: Types.ObjectId;
    assigneeUserId: Types.ObjectId;
    assignedBy?: Types.ObjectId;
    assigneeRole: string;
    dueDate?: Date;
    notes?: string;
    status: StudentSupportGovernanceWorkflowStatus;
    mentoringFramework?: string;
    grievanceRedressalSystem?: string;
    scholarshipSupport?: string;
    progressionTracking?: string;
    placementReadiness?: string;
    studentRepresentation?: string;
    wellbeingSupport?: string;
    inclusionSupport?: string;
    feedbackMechanism?: string;
    actionPlan?: string;
    mentorGroupIds: Types.ObjectId[];
    grievanceIds: Types.ObjectId[];
    progressionIds: Types.ObjectId[];
    representationIds: Types.ObjectId[];
    supportingLinks: string[];
    documentIds: Types.ObjectId[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    reviewHistory: IStudentSupportGovernanceAssignmentReviewEntry[];
    statusLogs: IStudentSupportGovernanceAssignmentStatusLog[];
    scopeDepartmentName?: string;
    scopeCollegeName?: string;
    scopeUniversityName?: string;
    scopeDepartmentId?: Types.ObjectId;
    scopeInstitutionId?: Types.ObjectId;
    scopeDepartmentOrganizationId?: Types.ObjectId;
    scopeCollegeOrganizationId?: Types.ObjectId;
    scopeUniversityOrganizationId?: Types.ObjectId;
    scopeOrganizationIds: Types.ObjectId[];
    submittedAt?: Date;
    reviewedAt?: Date;
    approvedAt?: Date;
    approvedBy?: Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ReviewEntrySchema = new Schema<IStudentSupportGovernanceAssignmentReviewEntry>(
    {
        reviewerId: { type: Schema.Types.ObjectId, ref: "User" },
        reviewerName: { type: String, trim: true },
        reviewerRole: { type: String, trim: true },
        stage: { type: String, required: true, trim: true },
        decision: { type: String, required: true, trim: true },
        remarks: { type: String, trim: true },
        reviewedAt: { type: Date, required: true },
    },
    { _id: false }
);

const StatusLogSchema = new Schema<IStudentSupportGovernanceAssignmentStatusLog>(
    {
        status: {
            type: String,
            enum: studentSupportGovernanceWorkflowStatusValues,
            required: true,
        },
        actorId: { type: Schema.Types.ObjectId, ref: "User" },
        actorName: { type: String, trim: true },
        actorRole: { type: String, trim: true },
        remarks: { type: String, trim: true },
        changedAt: { type: Date, required: true },
    },
    { _id: false }
);

const objectIdArrayField = {
    type: [{ type: Schema.Types.ObjectId }],
    default: [],
};

const StudentSupportGovernanceAssignmentSchema =
    new Schema<IStudentSupportGovernanceAssignment>(
        {
            planId: {
                type: Schema.Types.ObjectId,
                ref: "StudentSupportGovernancePlan",
                required: true,
                index: true,
            },
            assigneeUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
            assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
            assigneeRole: { type: String, required: true, trim: true, index: true },
            dueDate: { type: Date },
            notes: { type: String, trim: true },
            status: {
                type: String,
                enum: studentSupportGovernanceWorkflowStatusValues,
                required: true,
                default: "Draft",
                index: true,
            },
            mentoringFramework: { type: String, trim: true },
            grievanceRedressalSystem: { type: String, trim: true },
            scholarshipSupport: { type: String, trim: true },
            progressionTracking: { type: String, trim: true },
            placementReadiness: { type: String, trim: true },
            studentRepresentation: { type: String, trim: true },
            wellbeingSupport: { type: String, trim: true },
            inclusionSupport: { type: String, trim: true },
            feedbackMechanism: { type: String, trim: true },
            actionPlan: { type: String, trim: true },
            mentorGroupIds: objectIdArrayField,
            grievanceIds: objectIdArrayField,
            progressionIds: objectIdArrayField,
            representationIds: objectIdArrayField,
            supportingLinks: { type: [String], default: [] },
            documentIds: { type: [{ type: Schema.Types.ObjectId, ref: "Document" }], default: [] },
            contributorRemarks: { type: String, trim: true },
            reviewRemarks: { type: String, trim: true },
            reviewHistory: { type: [ReviewEntrySchema], default: [] },
            statusLogs: { type: [StatusLogSchema], default: [] },
            scopeDepartmentName: { type: String, trim: true, index: true },
            scopeCollegeName: { type: String, trim: true, index: true },
            scopeUniversityName: { type: String, trim: true, index: true },
            scopeDepartmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
            scopeInstitutionId: { type: Schema.Types.ObjectId, ref: "Institution", index: true },
            scopeDepartmentOrganizationId: {
                type: Schema.Types.ObjectId,
                ref: "Organization",
                index: true,
            },
            scopeCollegeOrganizationId: {
                type: Schema.Types.ObjectId,
                ref: "Organization",
                index: true,
            },
            scopeUniversityOrganizationId: {
                type: Schema.Types.ObjectId,
                ref: "Organization",
                index: true,
            },
            scopeOrganizationIds: {
                type: [{ type: Schema.Types.ObjectId, ref: "Organization" }],
                default: [],
            },
            submittedAt: { type: Date },
            reviewedAt: { type: Date },
            approvedAt: { type: Date },
            approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
            isActive: { type: Boolean, required: true, default: true, index: true },
        },
        { timestamps: true, collection: "student_support_governance_assignments" }
    );

StudentSupportGovernanceAssignmentSchema.index(
    { planId: 1, assigneeUserId: 1 },
    { unique: true }
);
StudentSupportGovernanceAssignmentSchema.index({ assigneeUserId: 1, status: 1, dueDate: 1 });

const StudentSupportGovernanceAssignment: Model<IStudentSupportGovernanceAssignment> =
    mongoose.models.StudentSupportGovernanceAssignment ||
    mongoose.model<IStudentSupportGovernanceAssignment>(
        "StudentSupportGovernanceAssignment",
        StudentSupportGovernanceAssignmentSchema
    );

export default StudentSupportGovernanceAssignment;
