import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const researchInnovationPlanStatusValues = [
    "Draft",
    "Active",
    "Locked",
] as const;

export const researchInnovationPlanScopeValues = [
    "Department",
    "Institution",
] as const;

export const researchInnovationFocusAreaValues = [
    "Research",
    "Innovation",
    "Integrated",
] as const;

export type ResearchInnovationPlanStatus =
    (typeof researchInnovationPlanStatusValues)[number];
export type ResearchInnovationPlanScope =
    (typeof researchInnovationPlanScopeValues)[number];
export type ResearchInnovationFocusArea =
    (typeof researchInnovationFocusAreaValues)[number];

export interface IResearchInnovationPlan extends Document {
    academicYearId: Types.ObjectId;
    institutionId?: Types.ObjectId;
    departmentId?: Types.ObjectId;
    facultyOwnerUserId?: Types.ObjectId;
    title: string;
    scopeType: ResearchInnovationPlanScope;
    focusArea: ResearchInnovationFocusArea;
    summary?: string;
    strategyGoals?: string;
    targetPublicationCount?: number;
    targetProjectCount?: number;
    targetPatentCount?: number;
    targetConsultancyCount?: number;
    targetStudentResearchCount?: number;
    targetInnovationActivityCount?: number;
    status: ResearchInnovationPlanStatus;
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

const ResearchInnovationPlanSchema = new Schema<IResearchInnovationPlan>(
    {
        academicYearId: {
            type: Schema.Types.ObjectId,
            ref: "AcademicYear",
            required: true,
            index: true,
        },
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", index: true },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
        facultyOwnerUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
        title: { type: String, required: true, trim: true },
        scopeType: {
            type: String,
            enum: researchInnovationPlanScopeValues,
            required: true,
            default: "Department",
            index: true,
        },
        focusArea: {
            type: String,
            enum: researchInnovationFocusAreaValues,
            required: true,
            default: "Integrated",
            index: true,
        },
        summary: { type: String, trim: true },
        strategyGoals: { type: String, trim: true },
        targetPublicationCount: { type: Number, min: 0, default: 0 },
        targetProjectCount: { type: Number, min: 0, default: 0 },
        targetPatentCount: { type: Number, min: 0, default: 0 },
        targetConsultancyCount: { type: Number, min: 0, default: 0 },
        targetStudentResearchCount: { type: Number, min: 0, default: 0 },
        targetInnovationActivityCount: { type: Number, min: 0, default: 0 },
        status: {
            type: String,
            enum: researchInnovationPlanStatusValues,
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
        scopeDepartmentOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
        scopeCollegeOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
        scopeUniversityOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
        scopeOrganizationIds: {
            type: [{ type: Schema.Types.ObjectId, ref: "Organization" }],
            default: [],
        },
    },
    { timestamps: true, collection: "research_innovation_plans" }
);

ResearchInnovationPlanSchema.index(
    { academicYearId: 1, scopeType: 1, institutionId: 1, departmentId: 1, title: 1 },
    { unique: true }
);
ResearchInnovationPlanSchema.index({ status: 1, updatedAt: -1 });

const ResearchInnovationPlan: Model<IResearchInnovationPlan> =
    mongoose.models.ResearchInnovationPlan ||
    mongoose.model<IResearchInnovationPlan>(
        "ResearchInnovationPlan",
        ResearchInnovationPlanSchema
    );

export default ResearchInnovationPlan;
