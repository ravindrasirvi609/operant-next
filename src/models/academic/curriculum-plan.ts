import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const curriculumPlanStatusValues = ["Draft", "Active", "Archived"] as const;

export type CurriculumPlanStatus = (typeof curriculumPlanStatusValues)[number];

export interface ICurriculumPlan extends Document {
    programId: Types.ObjectId;
    institutionId?: Types.ObjectId;
    departmentId: Types.ObjectId;
    effectiveFromAcademicYearId?: Types.ObjectId;
    title: string;
    regulationYear: string;
    totalCredits: number;
    status: CurriculumPlanStatus;
    summary?: string;
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

const CurriculumPlanSchema = new Schema<ICurriculumPlan>(
    {
        programId: { type: Schema.Types.ObjectId, ref: "Program", required: true, index: true },
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", index: true },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        effectiveFromAcademicYearId: {
            type: Schema.Types.ObjectId,
            ref: "AcademicYear",
            index: true,
        },
        title: { type: String, required: true, trim: true },
        regulationYear: { type: String, required: true, trim: true, index: true },
        totalCredits: { type: Number, required: true, min: 0, default: 0 },
        status: {
            type: String,
            enum: curriculumPlanStatusValues,
            required: true,
            default: "Draft",
            index: true,
        },
        summary: { type: String, trim: true },
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
    { timestamps: true, collection: "curricula" }
);

CurriculumPlanSchema.index(
    { programId: 1, regulationYear: 1, effectiveFromAcademicYearId: 1 },
    { unique: true }
);
CurriculumPlanSchema.index({ institutionId: 1, departmentId: 1, status: 1 });

const CurriculumPlan: Model<ICurriculumPlan> =
    mongoose.models.CurriculumPlan ||
    mongoose.model<ICurriculumPlan>("CurriculumPlan", CurriculumPlanSchema);

export default CurriculumPlan;
