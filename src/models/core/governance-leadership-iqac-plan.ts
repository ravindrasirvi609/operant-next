import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const governanceLeadershipIqacPlanStatusValues = [
    "Draft",
    "Active",
    "Locked",
] as const;

export const governanceLeadershipIqacPlanScopeValues = [
    "Department",
    "Institution",
] as const;

export const governanceLeadershipIqacFocusAreaValues = [
    "Leadership",
    "IQAC",
    "Governance",
    "Integrated",
] as const;

export type GovernanceLeadershipIqacPlanStatus =
    (typeof governanceLeadershipIqacPlanStatusValues)[number];
export type GovernanceLeadershipIqacPlanScope =
    (typeof governanceLeadershipIqacPlanScopeValues)[number];
export type GovernanceLeadershipIqacFocusArea =
    (typeof governanceLeadershipIqacFocusAreaValues)[number];

export interface IGovernanceLeadershipIqacPlan extends Document {
    academicYearId: Types.ObjectId;
    institutionId?: Types.ObjectId;
    departmentId?: Types.ObjectId;
    ownerUserId?: Types.ObjectId;
    title: string;
    scopeType: GovernanceLeadershipIqacPlanScope;
    focusArea: GovernanceLeadershipIqacFocusArea;
    summary?: string;
    strategicPriorities?: string;
    targetMeetingCount?: number;
    targetInitiativeCount?: number;
    targetPolicyCount?: number;
    targetComplianceReviewCount?: number;
    status: GovernanceLeadershipIqacPlanStatus;
    createdBy?: Types.ObjectId;
    scopeDepartmentName?: string;
    scopeCollegeName?: string;
    scopeUniversityName?: string;
    scopeDepartmentId?: Types.ObjectId;
    scopeInstitutionId?: Types.ObjectId;
    scopeDepartmentOrganizationId?: Types.ObjectId;
    scopeCollegeOrganizationId?: Types.ObjectId;
    scopeUniversityOrganizationId?: Types.ObjectId;
    scopeOrganizationIds: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const GovernanceLeadershipIqacPlanSchema = new Schema<IGovernanceLeadershipIqacPlan>(
    {
        academicYearId: {
            type: Schema.Types.ObjectId,
            ref: "AcademicYear",
            required: true,
            index: true,
        },
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", index: true },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
        ownerUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
        title: { type: String, required: true, trim: true },
        scopeType: {
            type: String,
            enum: governanceLeadershipIqacPlanScopeValues,
            required: true,
            default: "Department",
            index: true,
        },
        focusArea: {
            type: String,
            enum: governanceLeadershipIqacFocusAreaValues,
            required: true,
            default: "Integrated",
            index: true,
        },
        summary: { type: String, trim: true },
        strategicPriorities: { type: String, trim: true },
        targetMeetingCount: { type: Number, min: 0, default: 0 },
        targetInitiativeCount: { type: Number, min: 0, default: 0 },
        targetPolicyCount: { type: Number, min: 0, default: 0 },
        targetComplianceReviewCount: { type: Number, min: 0, default: 0 },
        status: {
            type: String,
            enum: governanceLeadershipIqacPlanStatusValues,
            required: true,
            default: "Draft",
            index: true,
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
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
    },
    { timestamps: true, collection: "governance_leadership_iqac_plans" }
);

GovernanceLeadershipIqacPlanSchema.index(
    { academicYearId: 1, scopeType: 1, institutionId: 1, departmentId: 1, title: 1 },
    { unique: true }
);
GovernanceLeadershipIqacPlanSchema.index({ status: 1, updatedAt: -1 });

const GovernanceLeadershipIqacPlan: Model<IGovernanceLeadershipIqacPlan> =
    mongoose.models.GovernanceLeadershipIqacPlan ||
    mongoose.model<IGovernanceLeadershipIqacPlan>(
        "GovernanceLeadershipIqacPlan",
        GovernanceLeadershipIqacPlanSchema
    );

export default GovernanceLeadershipIqacPlan;
