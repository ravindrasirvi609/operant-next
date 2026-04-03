import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const researchInnovationWorkflowStatusValues = [
    "Draft",
    "Submitted",
    "Research Review",
    "Under Review",
    "Committee Review",
    "Approved",
    "Rejected",
] as const;

export type ResearchInnovationWorkflowStatus =
    (typeof researchInnovationWorkflowStatusValues)[number];

export interface IResearchInnovationAssignmentReviewEntry {
    reviewerId?: Types.ObjectId;
    reviewerName?: string;
    reviewerRole?: string;
    stage: string;
    decision: string;
    remarks?: string;
    reviewedAt: Date;
}

export interface IResearchInnovationAssignmentStatusLog {
    status: ResearchInnovationWorkflowStatus;
    actorId?: Types.ObjectId;
    actorName?: string;
    actorRole?: string;
    remarks?: string;
    changedAt: Date;
}

export interface IResearchInnovationAssignment extends Document {
    planId: Types.ObjectId;
    assigneeUserId: Types.ObjectId;
    assignedBy?: Types.ObjectId;
    assigneeRole: string;
    dueDate?: Date;
    notes?: string;
    status: ResearchInnovationWorkflowStatus;
    researchStrategy?: string;
    fundingPipeline?: string;
    publicationQualityPractices?: string;
    innovationEcosystem?: string;
    incubationSupport?: string;
    consultancyTranslation?: string;
    iprCommercialization?: string;
    studentResearchEngagement?: string;
    collaborationHighlights?: string;
    ethicsAndCompliance?: string;
    facultyPublicationIds: Types.ObjectId[];
    facultyPatentIds: Types.ObjectId[];
    facultyResearchProjectIds: Types.ObjectId[];
    facultyConsultancyIds: Types.ObjectId[];
    researchPublicationIds: Types.ObjectId[];
    researchProjectIds: Types.ObjectId[];
    intellectualPropertyIds: Types.ObjectId[];
    researchActivityIds: Types.ObjectId[];
    studentPublicationIds: Types.ObjectId[];
    studentResearchProjectIds: Types.ObjectId[];
    activityIds: Types.ObjectId[];
    grantIds: Types.ObjectId[];
    startupIds: Types.ObjectId[];
    supportingLinks: string[];
    documentIds: Types.ObjectId[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    reviewHistory: IResearchInnovationAssignmentReviewEntry[];
    statusLogs: IResearchInnovationAssignmentStatusLog[];
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

const ReviewEntrySchema = new Schema<IResearchInnovationAssignmentReviewEntry>(
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

const StatusLogSchema = new Schema<IResearchInnovationAssignmentStatusLog>(
    {
        status: {
            type: String,
            enum: researchInnovationWorkflowStatusValues,
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

const ResearchInnovationAssignmentSchema =
    new Schema<IResearchInnovationAssignment>(
        {
            planId: {
                type: Schema.Types.ObjectId,
                ref: "ResearchInnovationPlan",
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
                enum: researchInnovationWorkflowStatusValues,
                required: true,
                default: "Draft",
                index: true,
            },
            researchStrategy: { type: String, trim: true },
            fundingPipeline: { type: String, trim: true },
            publicationQualityPractices: { type: String, trim: true },
            innovationEcosystem: { type: String, trim: true },
            incubationSupport: { type: String, trim: true },
            consultancyTranslation: { type: String, trim: true },
            iprCommercialization: { type: String, trim: true },
            studentResearchEngagement: { type: String, trim: true },
            collaborationHighlights: { type: String, trim: true },
            ethicsAndCompliance: { type: String, trim: true },
            facultyPublicationIds: objectIdArrayField,
            facultyPatentIds: objectIdArrayField,
            facultyResearchProjectIds: objectIdArrayField,
            facultyConsultancyIds: objectIdArrayField,
            researchPublicationIds: objectIdArrayField,
            researchProjectIds: objectIdArrayField,
            intellectualPropertyIds: objectIdArrayField,
            researchActivityIds: objectIdArrayField,
            studentPublicationIds: objectIdArrayField,
            studentResearchProjectIds: objectIdArrayField,
            activityIds: objectIdArrayField,
            grantIds: objectIdArrayField,
            startupIds: objectIdArrayField,
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
        { timestamps: true, collection: "research_innovation_assignments" }
    );

ResearchInnovationAssignmentSchema.index(
    { planId: 1, assigneeUserId: 1 },
    { unique: true }
);
ResearchInnovationAssignmentSchema.index({ assigneeUserId: 1, status: 1, dueDate: 1 });

const ResearchInnovationAssignment: Model<IResearchInnovationAssignment> =
    mongoose.models.ResearchInnovationAssignment ||
    mongoose.model<IResearchInnovationAssignment>(
        "ResearchInnovationAssignment",
        ResearchInnovationAssignmentSchema
    );

export default ResearchInnovationAssignment;
