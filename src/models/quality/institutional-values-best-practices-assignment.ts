import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const institutionalValuesBestPracticesWorkflowStatusValues = [
    "Draft",
    "Submitted",
    "IQAC Review",
    "Leadership Review",
    "Governance Review",
    "Approved",
    "Rejected",
] as const;

export type InstitutionalValuesBestPracticesWorkflowStatus =
    (typeof institutionalValuesBestPracticesWorkflowStatusValues)[number];

export interface IInstitutionalValuesBestPracticesAssignmentReviewEntry {
    reviewerId?: Types.ObjectId;
    reviewerName?: string;
    reviewerRole?: string;
    stage: string;
    decision: string;
    remarks?: string;
    reviewedAt: Date;
}

export interface IInstitutionalValuesBestPracticesAssignmentStatusLog {
    status: InstitutionalValuesBestPracticesWorkflowStatus;
    actorId?: Types.ObjectId;
    actorName?: string;
    actorRole?: string;
    remarks?: string;
    changedAt: Date;
}

export interface IInstitutionalValuesBestPracticesAssignment extends Document {
    planId: Types.ObjectId;
    assigneeUserId: Types.ObjectId;
    assignedBy?: Types.ObjectId;
    assigneeRole: string;
    dueDate?: Date;
    notes?: string;
    status: InstitutionalValuesBestPracticesWorkflowStatus;
    environmentalSustainabilityNarrative?: string;
    inclusivenessNarrative?: string;
    humanValuesNarrative?: string;
    communityOutreachNarrative?: string;
    bestPracticesNarrative?: string;
    institutionalDistinctivenessNarrative?: string;
    sustainabilityAuditNarrative?: string;
    actionPlan?: string;
    greenCampusInitiativeIds: Types.ObjectId[];
    environmentalResourceRecordIds: Types.ObjectId[];
    energyConsumptionRecordIds: Types.ObjectId[];
    waterManagementSystemIds: Types.ObjectId[];
    wasteManagementPracticeIds: Types.ObjectId[];
    genderEquityProgramIds: Types.ObjectId[];
    inclusivenessFacilityIds: Types.ObjectId[];
    ethicsProgramIds: Types.ObjectId[];
    codeOfConductRecordIds: Types.ObjectId[];
    communityOutreachProgramIds: Types.ObjectId[];
    outreachParticipantIds: Types.ObjectId[];
    institutionalBestPracticeIds: Types.ObjectId[];
    institutionalDistinctivenessIds: Types.ObjectId[];
    sustainabilityAuditIds: Types.ObjectId[];
    supportingLinks: string[];
    documentIds: Types.ObjectId[];
    contributorRemarks?: string;
    reviewRemarks?: string;
    reviewHistory: IInstitutionalValuesBestPracticesAssignmentReviewEntry[];
    statusLogs: IInstitutionalValuesBestPracticesAssignmentStatusLog[];
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

const ReviewEntrySchema = new Schema<IInstitutionalValuesBestPracticesAssignmentReviewEntry>(
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

const StatusLogSchema = new Schema<IInstitutionalValuesBestPracticesAssignmentStatusLog>(
    {
        status: {
            type: String,
            enum: institutionalValuesBestPracticesWorkflowStatusValues,
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

const InstitutionalValuesBestPracticesAssignmentSchema =
    new Schema<IInstitutionalValuesBestPracticesAssignment>(
        {
            planId: {
                type: Schema.Types.ObjectId,
                ref: "InstitutionalValuesBestPracticesPlan",
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
                enum: institutionalValuesBestPracticesWorkflowStatusValues,
                required: true,
                default: "Draft",
                index: true,
            },
            environmentalSustainabilityNarrative: { type: String, trim: true },
            inclusivenessNarrative: { type: String, trim: true },
            humanValuesNarrative: { type: String, trim: true },
            communityOutreachNarrative: { type: String, trim: true },
            bestPracticesNarrative: { type: String, trim: true },
            institutionalDistinctivenessNarrative: { type: String, trim: true },
            sustainabilityAuditNarrative: { type: String, trim: true },
            actionPlan: { type: String, trim: true },
            greenCampusInitiativeIds: objectIdArrayField,
            environmentalResourceRecordIds: objectIdArrayField,
            energyConsumptionRecordIds: objectIdArrayField,
            waterManagementSystemIds: objectIdArrayField,
            wasteManagementPracticeIds: objectIdArrayField,
            genderEquityProgramIds: objectIdArrayField,
            inclusivenessFacilityIds: objectIdArrayField,
            ethicsProgramIds: objectIdArrayField,
            codeOfConductRecordIds: objectIdArrayField,
            communityOutreachProgramIds: objectIdArrayField,
            outreachParticipantIds: objectIdArrayField,
            institutionalBestPracticeIds: objectIdArrayField,
            institutionalDistinctivenessIds: objectIdArrayField,
            sustainabilityAuditIds: objectIdArrayField,
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
        { timestamps: true, collection: "institutional_values_best_practices_assignments" }
    );

InstitutionalValuesBestPracticesAssignmentSchema.index(
    { planId: 1, assigneeUserId: 1 },
    { unique: true }
);
InstitutionalValuesBestPracticesAssignmentSchema.index({ assigneeUserId: 1, status: 1, dueDate: 1 });

const InstitutionalValuesBestPracticesAssignment: Model<IInstitutionalValuesBestPracticesAssignment> =
    mongoose.models.InstitutionalValuesBestPracticesAssignment ||
    mongoose.model<IInstitutionalValuesBestPracticesAssignment>(
        "InstitutionalValuesBestPracticesAssignment",
        InstitutionalValuesBestPracticesAssignmentSchema
    );

export default InstitutionalValuesBestPracticesAssignment;
