import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const teachingLearningWorkflowStatusValues = [
    "Draft",
    "Submitted",
    "Teaching Learning Review",
    "Under Review",
    "Committee Review",
    "Approved",
    "Rejected",
] as const;

export type TeachingLearningWorkflowStatus =
    (typeof teachingLearningWorkflowStatusValues)[number];

export interface ITeachingLearningAssignmentReviewEntry {
    reviewerId?: Types.ObjectId;
    reviewerName?: string;
    reviewerRole?: string;
    stage: string;
    decision: string;
    remarks?: string;
    reviewedAt: Date;
}

export interface ITeachingLearningAssignmentStatusLog {
    status: TeachingLearningWorkflowStatus;
    actorId?: Types.ObjectId;
    actorName?: string;
    actorRole?: string;
    remarks?: string;
    changedAt: Date;
}

export interface ITeachingLearningAssignment extends Document {
    planId: Types.ObjectId;
    assigneeUserId: Types.ObjectId;
    assignedBy?: Types.ObjectId;
    assigneeRole: string;
    dueDate?: Date;
    notes?: string;
    status: TeachingLearningWorkflowStatus;
    pedagogicalApproach?: string;
    learnerCentricPractices?: string;
    digitalResources?: string;
    attendanceStrategy?: string;
    feedbackAnalysis?: string;
    attainmentSummary?: string;
    actionTaken?: string;
    innovationHighlights?: string;
    supportingLinks: string[];
    lessonPlanDocumentId?: Types.ObjectId;
    questionPaperDocumentId?: Types.ObjectId;
    resultAnalysisDocumentId?: Types.ObjectId;
    documentIds: Types.ObjectId[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    reviewHistory: ITeachingLearningAssignmentReviewEntry[];
    statusLogs: ITeachingLearningAssignmentStatusLog[];
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

const TeachingLearningAssignmentReviewEntrySchema =
    new Schema<ITeachingLearningAssignmentReviewEntry>(
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

const TeachingLearningAssignmentStatusLogSchema =
    new Schema<ITeachingLearningAssignmentStatusLog>(
        {
            status: {
                type: String,
                enum: teachingLearningWorkflowStatusValues,
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

const TeachingLearningAssignmentSchema = new Schema<ITeachingLearningAssignment>(
    {
        planId: { type: Schema.Types.ObjectId, ref: "TeachingLearningPlan", required: true, index: true },
        assigneeUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
        assigneeRole: { type: String, required: true, trim: true, index: true },
        dueDate: { type: Date },
        notes: { type: String, trim: true },
        status: {
            type: String,
            enum: teachingLearningWorkflowStatusValues,
            required: true,
            default: "Draft",
            index: true,
        },
        pedagogicalApproach: { type: String, trim: true },
        learnerCentricPractices: { type: String, trim: true },
        digitalResources: { type: String, trim: true },
        attendanceStrategy: { type: String, trim: true },
        feedbackAnalysis: { type: String, trim: true },
        attainmentSummary: { type: String, trim: true },
        actionTaken: { type: String, trim: true },
        innovationHighlights: { type: String, trim: true },
        supportingLinks: { type: [String], default: [] },
        lessonPlanDocumentId: { type: Schema.Types.ObjectId, ref: "Document" },
        questionPaperDocumentId: { type: Schema.Types.ObjectId, ref: "Document" },
        resultAnalysisDocumentId: { type: Schema.Types.ObjectId, ref: "Document" },
        documentIds: { type: [{ type: Schema.Types.ObjectId, ref: "Document" }], default: [] },
        contributorRemarks: { type: String, trim: true },
        reviewRemarks: { type: String, trim: true },
        reviewHistory: { type: [TeachingLearningAssignmentReviewEntrySchema], default: [] },
        statusLogs: { type: [TeachingLearningAssignmentStatusLogSchema], default: [] },
        scopeDepartmentName: { type: String, trim: true, index: true },
        scopeCollegeName: { type: String, trim: true, index: true },
        scopeUniversityName: { type: String, trim: true, index: true },
        scopeDepartmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
        scopeInstitutionId: { type: Schema.Types.ObjectId, ref: "Institution", index: true },
        scopeDepartmentOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
        scopeCollegeOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
        scopeUniversityOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
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
    { timestamps: true, collection: "teaching_learning_assignments" }
);

TeachingLearningAssignmentSchema.index(
    { planId: 1, assigneeUserId: 1 },
    { unique: true }
);
TeachingLearningAssignmentSchema.index({ assigneeUserId: 1, status: 1, dueDate: 1 });

const TeachingLearningAssignment: Model<ITeachingLearningAssignment> =
    mongoose.models.TeachingLearningAssignment ||
    mongoose.model<ITeachingLearningAssignment>(
        "TeachingLearningAssignment",
        TeachingLearningAssignmentSchema
    );

export default TeachingLearningAssignment;
