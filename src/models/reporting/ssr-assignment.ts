import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const ssrWorkflowStatusValues = [
    "Draft",
    "Submitted",
    "Under Review",
    "Committee Review",
    "Approved",
    "Rejected",
] as const;

export type SsrWorkflowStatus = (typeof ssrWorkflowStatusValues)[number];

export interface ISsrAssignment extends Document {
    cycleId: Types.ObjectId;
    criterionId: Types.ObjectId;
    metricId: Types.ObjectId;
    sectionId?: Types.ObjectId;
    assigneeUserId: Types.ObjectId;
    assignedBy?: Types.ObjectId;
    assigneeRole: string;
    dueDate?: Date;
    notes?: string;
    status: SsrWorkflowStatus;
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
    approvedAt?: Date;
    approvedBy?: Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SsrAssignmentSchema = new Schema<ISsrAssignment>(
    {
        cycleId: { type: Schema.Types.ObjectId, ref: "SsrCycle", required: true, index: true },
        criterionId: { type: Schema.Types.ObjectId, ref: "SsrCriterion", required: true, index: true },
        metricId: { type: Schema.Types.ObjectId, ref: "SsrMetric", required: true, index: true },
        sectionId: { type: Schema.Types.ObjectId, ref: "SsrNarrativeSection", index: true },
        assigneeUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
        assigneeRole: { type: String, required: true, trim: true, index: true },
        dueDate: { type: Date },
        notes: { type: String, trim: true },
        status: {
            type: String,
            enum: ssrWorkflowStatusValues,
            required: true,
            default: "Draft",
            index: true,
        },
        scopeDepartmentName: { type: String, trim: true, index: true },
        scopeCollegeName: { type: String, trim: true, index: true },
        scopeUniversityName: { type: String, trim: true, index: true },
        scopeDepartmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
        scopeInstitutionId: { type: Schema.Types.ObjectId, ref: "Institution", index: true },
        scopeDepartmentOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
        scopeCollegeOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
        scopeUniversityOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
        scopeOrganizationIds: { type: [{ type: Schema.Types.ObjectId, ref: "Organization" }], default: [] },
        submittedAt: { type: Date },
        approvedAt: { type: Date },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
        isActive: { type: Boolean, required: true, default: true, index: true },
    },
    { timestamps: true, collection: "ssr_assignments" }
);

SsrAssignmentSchema.index(
    { cycleId: 1, metricId: 1, sectionId: 1, assigneeUserId: 1 },
    { unique: true }
);
SsrAssignmentSchema.index({ assigneeUserId: 1, status: 1, dueDate: 1 });

const SsrAssignment: Model<ISsrAssignment> =
    mongoose.models.SsrAssignment ||
    mongoose.model<ISsrAssignment>("SsrAssignment", SsrAssignmentSchema);

export default SsrAssignment;
