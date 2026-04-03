import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const infrastructureLibraryPlanStatusValues = [
    "Draft",
    "Active",
    "Locked",
] as const;

export const infrastructureLibraryPlanScopeValues = [
    "Department",
    "Institution",
] as const;

export const infrastructureLibraryFocusAreaValues = [
    "Infrastructure",
    "Library",
    "Integrated",
] as const;

export type InfrastructureLibraryPlanStatus =
    (typeof infrastructureLibraryPlanStatusValues)[number];
export type InfrastructureLibraryPlanScope =
    (typeof infrastructureLibraryPlanScopeValues)[number];
export type InfrastructureLibraryFocusArea =
    (typeof infrastructureLibraryFocusAreaValues)[number];

export interface IInfrastructureLibraryPlan extends Document {
    academicYearId: Types.ObjectId;
    institutionId?: Types.ObjectId;
    departmentId?: Types.ObjectId;
    facultyOwnerUserId?: Types.ObjectId;
    title: string;
    scopeType: InfrastructureLibraryPlanScope;
    focusArea: InfrastructureLibraryFocusArea;
    summary?: string;
    strategyGoals?: string;
    targetClassroomCount?: number;
    targetLaboratoryCount?: number;
    targetBookCount?: number;
    targetJournalCount?: number;
    targetEresourceCount?: number;
    targetBandwidthMbps?: number;
    status: InfrastructureLibraryPlanStatus;
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

const InfrastructureLibraryPlanSchema = new Schema<IInfrastructureLibraryPlan>(
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
            enum: infrastructureLibraryPlanScopeValues,
            required: true,
            default: "Department",
            index: true,
        },
        focusArea: {
            type: String,
            enum: infrastructureLibraryFocusAreaValues,
            required: true,
            default: "Integrated",
            index: true,
        },
        summary: { type: String, trim: true },
        strategyGoals: { type: String, trim: true },
        targetClassroomCount: { type: Number, min: 0, default: 0 },
        targetLaboratoryCount: { type: Number, min: 0, default: 0 },
        targetBookCount: { type: Number, min: 0, default: 0 },
        targetJournalCount: { type: Number, min: 0, default: 0 },
        targetEresourceCount: { type: Number, min: 0, default: 0 },
        targetBandwidthMbps: { type: Number, min: 0, default: 0 },
        status: {
            type: String,
            enum: infrastructureLibraryPlanStatusValues,
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
    { timestamps: true, collection: "infrastructure_library_plans" }
);

InfrastructureLibraryPlanSchema.index(
    { academicYearId: 1, scopeType: 1, institutionId: 1, departmentId: 1, title: 1 },
    { unique: true }
);
InfrastructureLibraryPlanSchema.index({ status: 1, updatedAt: -1 });

const InfrastructureLibraryPlan: Model<IInfrastructureLibraryPlan> =
    mongoose.models.InfrastructureLibraryPlan ||
    mongoose.model<IInfrastructureLibraryPlan>(
        "InfrastructureLibraryPlan",
        InfrastructureLibraryPlanSchema
    );

export default InfrastructureLibraryPlan;
