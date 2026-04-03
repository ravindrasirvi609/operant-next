import mongoose, { Document, Model, Schema, Types } from "mongoose";

import { ssrWorkflowStatusValues, type SsrWorkflowStatus } from "@/models/reporting/ssr-assignment";

export interface ISsrResponseReviewEntry {
    reviewerId?: Types.ObjectId;
    reviewerName?: string;
    reviewerRole?: string;
    stage: string;
    decision: string;
    remarks?: string;
    reviewedAt: Date;
}

export interface ISsrResponseStatusLog {
    status: SsrWorkflowStatus;
    actorId?: Types.ObjectId;
    actorName?: string;
    actorRole?: string;
    remarks?: string;
    changedAt: Date;
}

export interface ISsrMetricResponse extends Document {
    assignmentId: Types.ObjectId;
    cycleId: Types.ObjectId;
    criterionId: Types.ObjectId;
    metricId: Types.ObjectId;
    sectionId?: Types.ObjectId;
    contributorUserId: Types.ObjectId;
    status: SsrWorkflowStatus;
    narrativeResponse?: string;
    metricValueNumeric?: number;
    metricValueText?: string;
    metricValueBoolean?: boolean;
    metricValueDate?: Date;
    tableData?: Record<string, unknown>;
    supportingLinks: string[];
    documentIds: Types.ObjectId[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    reviewHistory: ISsrResponseReviewEntry[];
    statusLogs: ISsrResponseStatusLog[];
    scopeDepartmentName?: string;
    scopeCollegeName?: string;
    scopeUniversityName?: string;
    scopeDepartmentId?: Types.ObjectId;
    scopeInstitutionId?: Types.ObjectId;
    scopeDepartmentOrganizationId?: Types.ObjectId;
    scopeCollegeOrganizationId?: Types.ObjectId;
    scopeUniversityOrganizationId?: Types.ObjectId;
    scopeOrganizationIds: Types.ObjectId[];
    version: number;
    submittedAt?: Date;
    reviewedAt?: Date;
    approvedAt?: Date;
    approvedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const SsrResponseReviewEntrySchema = new Schema<ISsrResponseReviewEntry>(
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

const SsrResponseStatusLogSchema = new Schema<ISsrResponseStatusLog>(
    {
        status: { type: String, enum: ssrWorkflowStatusValues, required: true },
        actorId: { type: Schema.Types.ObjectId, ref: "User" },
        actorName: { type: String, trim: true },
        actorRole: { type: String, trim: true },
        remarks: { type: String, trim: true },
        changedAt: { type: Date, required: true },
    },
    { _id: false }
);

const SsrMetricResponseSchema = new Schema<ISsrMetricResponse>(
    {
        assignmentId: { type: Schema.Types.ObjectId, ref: "SsrAssignment", required: true },
        cycleId: { type: Schema.Types.ObjectId, ref: "SsrCycle", required: true, index: true },
        criterionId: { type: Schema.Types.ObjectId, ref: "SsrCriterion", required: true, index: true },
        metricId: { type: Schema.Types.ObjectId, ref: "SsrMetric", required: true, index: true },
        sectionId: { type: Schema.Types.ObjectId, ref: "SsrNarrativeSection", index: true },
        contributorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        status: {
            type: String,
            enum: ssrWorkflowStatusValues,
            required: true,
            default: "Draft",
            index: true,
        },
        narrativeResponse: { type: String, trim: true },
        metricValueNumeric: { type: Number },
        metricValueText: { type: String, trim: true },
        metricValueBoolean: { type: Boolean },
        metricValueDate: { type: Date },
        tableData: { type: Schema.Types.Mixed, default: undefined },
        supportingLinks: { type: [String], default: [] },
        documentIds: { type: [{ type: Schema.Types.ObjectId, ref: "Document" }], default: [] },
        contributorRemarks: { type: String, trim: true },
        reviewRemarks: { type: String, trim: true },
        reviewHistory: { type: [SsrResponseReviewEntrySchema], default: [] },
        statusLogs: { type: [SsrResponseStatusLogSchema], default: [] },
        scopeDepartmentName: { type: String, trim: true, index: true },
        scopeCollegeName: { type: String, trim: true, index: true },
        scopeUniversityName: { type: String, trim: true, index: true },
        scopeDepartmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
        scopeInstitutionId: { type: Schema.Types.ObjectId, ref: "Institution", index: true },
        scopeDepartmentOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
        scopeCollegeOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
        scopeUniversityOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
        scopeOrganizationIds: { type: [{ type: Schema.Types.ObjectId, ref: "Organization" }], default: [] },
        version: { type: Number, required: true, default: 1 },
        submittedAt: { type: Date },
        reviewedAt: { type: Date },
        approvedAt: { type: Date },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true, collection: "ssr_metric_responses" }
);

SsrMetricResponseSchema.index({ assignmentId: 1 }, { unique: true });
SsrMetricResponseSchema.index({ contributorUserId: 1, status: 1, updatedAt: -1 });

const SsrMetricResponse: Model<ISsrMetricResponse> =
    mongoose.models.SsrMetricResponse ||
    mongoose.model<ISsrMetricResponse>("SsrMetricResponse", SsrMetricResponseSchema);

export default SsrMetricResponse;
