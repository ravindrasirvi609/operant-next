import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const infrastructureLibraryWorkflowStatusValues = [
    "Draft",
    "Submitted",
    "Infrastructure Review",
    "Under Review",
    "Committee Review",
    "Approved",
    "Rejected",
] as const;

export type InfrastructureLibraryWorkflowStatus =
    (typeof infrastructureLibraryWorkflowStatusValues)[number];

export interface IInfrastructureLibraryAssignmentReviewEntry {
    reviewerId?: Types.ObjectId;
    reviewerName?: string;
    reviewerRole?: string;
    stage: string;
    decision: string;
    remarks?: string;
    reviewedAt: Date;
}

export interface IInfrastructureLibraryAssignmentStatusLog {
    status: InfrastructureLibraryWorkflowStatus;
    actorId?: Types.ObjectId;
    actorName?: string;
    actorRole?: string;
    remarks?: string;
    changedAt: Date;
}

export interface IInfrastructureLibraryAssignment extends Document {
    planId: Types.ObjectId;
    assigneeUserId: Types.ObjectId;
    assignedBy?: Types.ObjectId;
    assigneeRole: string;
    dueDate?: Date;
    notes?: string;
    status: InfrastructureLibraryWorkflowStatus;
    infrastructureOverview?: string;
    libraryOverview?: string;
    digitalAccessStrategy?: string;
    maintenanceProtocol?: string;
    utilizationInsights?: string;
    accessibilitySupport?: string;
    greenPractices?: string;
    safetyCompliance?: string;
    studentSupportServices?: string;
    resourceGapActionPlan?: string;
    facilityIds: Types.ObjectId[];
    libraryResourceIds: Types.ObjectId[];
    usageIds: Types.ObjectId[];
    maintenanceIds: Types.ObjectId[];
    supportingLinks: string[];
    documentIds: Types.ObjectId[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    reviewHistory: IInfrastructureLibraryAssignmentReviewEntry[];
    statusLogs: IInfrastructureLibraryAssignmentStatusLog[];
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

const ReviewEntrySchema = new Schema<IInfrastructureLibraryAssignmentReviewEntry>(
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

const StatusLogSchema = new Schema<IInfrastructureLibraryAssignmentStatusLog>(
    {
        status: {
            type: String,
            enum: infrastructureLibraryWorkflowStatusValues,
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

const InfrastructureLibraryAssignmentSchema =
    new Schema<IInfrastructureLibraryAssignment>(
        {
            planId: {
                type: Schema.Types.ObjectId,
                ref: "InfrastructureLibraryPlan",
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
                enum: infrastructureLibraryWorkflowStatusValues,
                required: true,
                default: "Draft",
                index: true,
            },
            infrastructureOverview: { type: String, trim: true },
            libraryOverview: { type: String, trim: true },
            digitalAccessStrategy: { type: String, trim: true },
            maintenanceProtocol: { type: String, trim: true },
            utilizationInsights: { type: String, trim: true },
            accessibilitySupport: { type: String, trim: true },
            greenPractices: { type: String, trim: true },
            safetyCompliance: { type: String, trim: true },
            studentSupportServices: { type: String, trim: true },
            resourceGapActionPlan: { type: String, trim: true },
            facilityIds: objectIdArrayField,
            libraryResourceIds: objectIdArrayField,
            usageIds: objectIdArrayField,
            maintenanceIds: objectIdArrayField,
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
        { timestamps: true, collection: "infrastructure_library_assignments" }
    );

InfrastructureLibraryAssignmentSchema.index(
    { planId: 1, assigneeUserId: 1 },
    { unique: true }
);
InfrastructureLibraryAssignmentSchema.index({ assigneeUserId: 1, status: 1, dueDate: 1 });

const InfrastructureLibraryAssignment: Model<IInfrastructureLibraryAssignment> =
    mongoose.models.InfrastructureLibraryAssignment ||
    mongoose.model<IInfrastructureLibraryAssignment>(
        "InfrastructureLibraryAssignment",
        InfrastructureLibraryAssignmentSchema
    );

export default InfrastructureLibraryAssignment;
