import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const governanceLeadershipIqacWorkflowStatusValues = [
    "Draft",
    "Submitted",
    "IQAC Review",
    "Leadership Review",
    "Governance Review",
    "Approved",
    "Rejected",
] as const;

export type GovernanceLeadershipIqacWorkflowStatus =
    (typeof governanceLeadershipIqacWorkflowStatusValues)[number];

export interface IGovernanceLeadershipIqacAssignmentReviewEntry {
    reviewerId?: Types.ObjectId;
    reviewerName?: string;
    reviewerRole?: string;
    stage: string;
    decision: string;
    remarks?: string;
    reviewedAt: Date;
}

export interface IGovernanceLeadershipIqacAssignmentStatusLog {
    status: GovernanceLeadershipIqacWorkflowStatus;
    actorId?: Types.ObjectId;
    actorName?: string;
    actorRole?: string;
    remarks?: string;
    changedAt: Date;
}

export interface IGovernanceLeadershipIqacAssignment extends Document {
    planId: Types.ObjectId;
    assigneeUserId: Types.ObjectId;
    assignedBy?: Types.ObjectId;
    assigneeRole: string;
    dueDate?: Date;
    notes?: string;
    status: GovernanceLeadershipIqacWorkflowStatus;
    governanceStructureNarrative?: string;
    leadershipParticipationNarrative?: string;
    iqacFrameworkNarrative?: string;
    qualityInitiativesNarrative?: string;
    policyGovernanceNarrative?: string;
    complianceMonitoringNarrative?: string;
    stakeholderParticipationNarrative?: string;
    institutionalBestPracticesNarrative?: string;
    feedbackLoopNarrative?: string;
    actionPlan?: string;
    iqacMeetingIds: Types.ObjectId[];
    qualityInitiativeIds: Types.ObjectId[];
    policyCircularIds: Types.ObjectId[];
    complianceReviewIds: Types.ObjectId[];
    supportingLinks: string[];
    documentIds: Types.ObjectId[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    reviewHistory: IGovernanceLeadershipIqacAssignmentReviewEntry[];
    statusLogs: IGovernanceLeadershipIqacAssignmentStatusLog[];
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

const ReviewEntrySchema = new Schema<IGovernanceLeadershipIqacAssignmentReviewEntry>(
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

const StatusLogSchema = new Schema<IGovernanceLeadershipIqacAssignmentStatusLog>(
    {
        status: {
            type: String,
            enum: governanceLeadershipIqacWorkflowStatusValues,
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

const GovernanceLeadershipIqacAssignmentSchema =
    new Schema<IGovernanceLeadershipIqacAssignment>(
        {
            planId: {
                type: Schema.Types.ObjectId,
                ref: "GovernanceLeadershipIqacPlan",
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
                enum: governanceLeadershipIqacWorkflowStatusValues,
                required: true,
                default: "Draft",
                index: true,
            },
            governanceStructureNarrative: { type: String, trim: true },
            leadershipParticipationNarrative: { type: String, trim: true },
            iqacFrameworkNarrative: { type: String, trim: true },
            qualityInitiativesNarrative: { type: String, trim: true },
            policyGovernanceNarrative: { type: String, trim: true },
            complianceMonitoringNarrative: { type: String, trim: true },
            stakeholderParticipationNarrative: { type: String, trim: true },
            institutionalBestPracticesNarrative: { type: String, trim: true },
            feedbackLoopNarrative: { type: String, trim: true },
            actionPlan: { type: String, trim: true },
            iqacMeetingIds: objectIdArrayField,
            qualityInitiativeIds: objectIdArrayField,
            policyCircularIds: objectIdArrayField,
            complianceReviewIds: objectIdArrayField,
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
        { timestamps: true, collection: "governance_leadership_iqac_assignments" }
    );

GovernanceLeadershipIqacAssignmentSchema.index(
    { planId: 1, assigneeUserId: 1 },
    { unique: true }
);
GovernanceLeadershipIqacAssignmentSchema.index({ assigneeUserId: 1, status: 1, dueDate: 1 });

const GovernanceLeadershipIqacAssignment: Model<IGovernanceLeadershipIqacAssignment> =
    mongoose.models.GovernanceLeadershipIqacAssignment ||
    mongoose.model<IGovernanceLeadershipIqacAssignment>(
        "GovernanceLeadershipIqacAssignment",
        GovernanceLeadershipIqacAssignmentSchema
    );

export default GovernanceLeadershipIqacAssignment;
