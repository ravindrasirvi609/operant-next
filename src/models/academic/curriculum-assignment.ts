import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const curriculumWorkflowStatusValues = [
    "Draft",
    "Submitted",
    "Board Review",
    "Under Review",
    "Committee Review",
    "Approved",
    "Rejected",
] as const;

export type CurriculumWorkflowStatus = (typeof curriculumWorkflowStatusValues)[number];

export interface ICurriculumAssignmentReviewEntry {
    reviewerId?: Types.ObjectId;
    reviewerName?: string;
    reviewerRole?: string;
    stage: string;
    decision: string;
    remarks?: string;
    reviewedAt: Date;
}

export interface ICurriculumAssignmentStatusLog {
    status: CurriculumWorkflowStatus;
    actorId?: Types.ObjectId;
    actorName?: string;
    actorRole?: string;
    remarks?: string;
    changedAt: Date;
}

export interface ICurriculumAssignment extends Document {
    curriculumId: Types.ObjectId;
    curriculumCourseId: Types.ObjectId;
    syllabusVersionId: Types.ObjectId;
    assigneeUserId: Types.ObjectId;
    assignedBy?: Types.ObjectId;
    assigneeRole: string;
    dueDate?: Date;
    notes?: string;
    status: CurriculumWorkflowStatus;
    supportingLinks: string[];
    documentIds: Types.ObjectId[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    reviewHistory: ICurriculumAssignmentReviewEntry[];
    statusLogs: ICurriculumAssignmentStatusLog[];
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

const CurriculumAssignmentReviewEntrySchema = new Schema<ICurriculumAssignmentReviewEntry>(
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

const CurriculumAssignmentStatusLogSchema = new Schema<ICurriculumAssignmentStatusLog>(
    {
        status: { type: String, enum: curriculumWorkflowStatusValues, required: true },
        actorId: { type: Schema.Types.ObjectId, ref: "User" },
        actorName: { type: String, trim: true },
        actorRole: { type: String, trim: true },
        remarks: { type: String, trim: true },
        changedAt: { type: Date, required: true },
    },
    { _id: false }
);

const CurriculumAssignmentSchema = new Schema<ICurriculumAssignment>(
    {
        curriculumId: { type: Schema.Types.ObjectId, ref: "CurriculumPlan", required: true, index: true },
        curriculumCourseId: {
            type: Schema.Types.ObjectId,
            ref: "CurriculumCourse",
            required: true,
            index: true,
        },
        syllabusVersionId: {
            type: Schema.Types.ObjectId,
            ref: "CurriculumSyllabusVersion",
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
            enum: curriculumWorkflowStatusValues,
            required: true,
            default: "Draft",
            index: true,
        },
        supportingLinks: { type: [String], default: [] },
        documentIds: { type: [{ type: Schema.Types.ObjectId, ref: "Document" }], default: [] },
        contributorRemarks: { type: String, trim: true },
        reviewRemarks: { type: String, trim: true },
        reviewHistory: { type: [CurriculumAssignmentReviewEntrySchema], default: [] },
        statusLogs: { type: [CurriculumAssignmentStatusLogSchema], default: [] },
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
    { timestamps: true, collection: "curriculum_assignments" }
);

CurriculumAssignmentSchema.index(
    { curriculumId: 1, curriculumCourseId: 1, syllabusVersionId: 1, assigneeUserId: 1 },
    { unique: true }
);
CurriculumAssignmentSchema.index({ assigneeUserId: 1, status: 1, dueDate: 1 });

const CurriculumAssignment: Model<ICurriculumAssignment> =
    mongoose.models.CurriculumAssignment ||
    mongoose.model<ICurriculumAssignment>("CurriculumAssignment", CurriculumAssignmentSchema);

export default CurriculumAssignment;
