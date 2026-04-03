import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const studentSupportGovernancePlanStatusValues = [
    "Draft",
    "Active",
    "Locked",
] as const;

export const studentSupportGovernancePlanScopeValues = [
    "Department",
    "Institution",
] as const;

export const studentSupportGovernanceFocusAreaValues = [
    "StudentSupport",
    "Governance",
    "Integrated",
] as const;

export type StudentSupportGovernancePlanStatus =
    (typeof studentSupportGovernancePlanStatusValues)[number];
export type StudentSupportGovernancePlanScope =
    (typeof studentSupportGovernancePlanScopeValues)[number];
export type StudentSupportGovernanceFocusArea =
    (typeof studentSupportGovernanceFocusAreaValues)[number];

export interface IStudentSupportGovernancePlan extends Document {
    academicYearId: Types.ObjectId;
    institutionId?: Types.ObjectId;
    departmentId?: Types.ObjectId;
    facultyOwnerUserId?: Types.ObjectId;
    title: string;
    scopeType: StudentSupportGovernancePlanScope;
    focusArea: StudentSupportGovernanceFocusArea;
    summary?: string;
    strategyGoals?: string;
    targetMentorGroupCount?: number;
    targetGrievanceClosureCount?: number;
    targetScholarshipBeneficiaryCount?: number;
    targetPlacementCount?: number;
    targetHigherStudiesCount?: number;
    targetRepresentationCount?: number;
    status: StudentSupportGovernancePlanStatus;
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

const StudentSupportGovernancePlanSchema = new Schema<IStudentSupportGovernancePlan>(
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
            enum: studentSupportGovernancePlanScopeValues,
            required: true,
            default: "Department",
            index: true,
        },
        focusArea: {
            type: String,
            enum: studentSupportGovernanceFocusAreaValues,
            required: true,
            default: "Integrated",
            index: true,
        },
        summary: { type: String, trim: true },
        strategyGoals: { type: String, trim: true },
        targetMentorGroupCount: { type: Number, min: 0, default: 0 },
        targetGrievanceClosureCount: { type: Number, min: 0, default: 0 },
        targetScholarshipBeneficiaryCount: { type: Number, min: 0, default: 0 },
        targetPlacementCount: { type: Number, min: 0, default: 0 },
        targetHigherStudiesCount: { type: Number, min: 0, default: 0 },
        targetRepresentationCount: { type: Number, min: 0, default: 0 },
        status: {
            type: String,
            enum: studentSupportGovernancePlanStatusValues,
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
    { timestamps: true, collection: "student_support_governance_plans" }
);

StudentSupportGovernancePlanSchema.index(
    { academicYearId: 1, scopeType: 1, institutionId: 1, departmentId: 1, title: 1 },
    { unique: true }
);
StudentSupportGovernancePlanSchema.index({ status: 1, updatedAt: -1 });

const StudentSupportGovernancePlan: Model<IStudentSupportGovernancePlan> =
    mongoose.models.StudentSupportGovernancePlan ||
    mongoose.model<IStudentSupportGovernancePlan>(
        "StudentSupportGovernancePlan",
        StudentSupportGovernancePlanSchema
    );

export default StudentSupportGovernancePlan;
