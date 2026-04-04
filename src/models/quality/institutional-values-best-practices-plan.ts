import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const institutionalValuesBestPracticesPlanStatusValues = [
    "Draft",
    "Active",
    "Locked",
] as const;

export const institutionalValuesBestPracticesPlanScopeValues = [
    "Department",
    "Institution",
] as const;

export const institutionalValuesBestPracticesThemeValues = [
    "Environment",
    "Inclusiveness",
    "Ethics",
    "Outreach",
    "BestPractices",
    "Distinctiveness",
    "Integrated",
] as const;

export type InstitutionalValuesBestPracticesPlanStatus =
    (typeof institutionalValuesBestPracticesPlanStatusValues)[number];
export type InstitutionalValuesBestPracticesPlanScope =
    (typeof institutionalValuesBestPracticesPlanScopeValues)[number];
export type InstitutionalValuesBestPracticesTheme =
    (typeof institutionalValuesBestPracticesThemeValues)[number];

export interface IInstitutionalValuesBestPracticesPlan extends Document {
    academicYearId: Types.ObjectId;
    institutionId?: Types.ObjectId;
    departmentId?: Types.ObjectId;
    ownerUserId?: Types.ObjectId;
    title: string;
    scopeType: InstitutionalValuesBestPracticesPlanScope;
    theme: InstitutionalValuesBestPracticesTheme;
    overview?: string;
    strategicPriorities?: string;
    targetEnvironmentalRecords?: number;
    targetInclusionRecords?: number;
    targetEthicsRecords?: number;
    targetOutreachPrograms?: number;
    targetBestPractices?: number;
    targetDistinctivenessNarratives?: number;
    targetAuditCount?: number;
    status: InstitutionalValuesBestPracticesPlanStatus;
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

const InstitutionalValuesBestPracticesPlanSchema = new Schema<IInstitutionalValuesBestPracticesPlan>(
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
            enum: institutionalValuesBestPracticesPlanScopeValues,
            required: true,
            default: "Department",
            index: true,
        },
        theme: {
            type: String,
            enum: institutionalValuesBestPracticesThemeValues,
            required: true,
            default: "Integrated",
            index: true,
        },
        overview: { type: String, trim: true },
        strategicPriorities: { type: String, trim: true },
        targetEnvironmentalRecords: { type: Number, min: 0, default: 0 },
        targetInclusionRecords: { type: Number, min: 0, default: 0 },
        targetEthicsRecords: { type: Number, min: 0, default: 0 },
        targetOutreachPrograms: { type: Number, min: 0, default: 0 },
        targetBestPractices: { type: Number, min: 0, default: 0 },
        targetDistinctivenessNarratives: { type: Number, min: 0, default: 0 },
        targetAuditCount: { type: Number, min: 0, default: 0 },
        status: {
            type: String,
            enum: institutionalValuesBestPracticesPlanStatusValues,
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
    { timestamps: true, collection: "institutional_values_best_practices_plans" }
);

InstitutionalValuesBestPracticesPlanSchema.index(
    { academicYearId: 1, scopeType: 1, institutionId: 1, departmentId: 1, title: 1 },
    { unique: true }
);
InstitutionalValuesBestPracticesPlanSchema.index({ status: 1, updatedAt: -1 });

const InstitutionalValuesBestPracticesPlan: Model<IInstitutionalValuesBestPracticesPlan> =
    mongoose.models.InstitutionalValuesBestPracticesPlan ||
    mongoose.model<IInstitutionalValuesBestPracticesPlan>(
        "InstitutionalValuesBestPracticesPlan",
        InstitutionalValuesBestPracticesPlanSchema
    );

export default InstitutionalValuesBestPracticesPlan;
