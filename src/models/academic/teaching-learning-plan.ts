import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const teachingLearningPlanStatusValues = ["Draft", "Active", "Archived"] as const;
export const teachingLearningDeliveryTypeValues = [
    "Theory",
    "Lab",
    "Project",
    "Blended",
    "Fieldwork",
    "Other",
] as const;

export type TeachingLearningPlanStatus = (typeof teachingLearningPlanStatusValues)[number];
export type TeachingLearningDeliveryType = (typeof teachingLearningDeliveryTypeValues)[number];

export interface ITeachingLearningPlan extends Document {
    academicYearId: Types.ObjectId;
    programId: Types.ObjectId;
    courseId: Types.ObjectId;
    semesterId: Types.ObjectId;
    institutionId?: Types.ObjectId;
    departmentId: Types.ObjectId;
    facultyOwnerUserId?: Types.ObjectId;
    sourceTeachingLoadId?: Types.ObjectId;
    title: string;
    sectionName?: string;
    deliveryType: TeachingLearningDeliveryType;
    plannedSessions: number;
    plannedContactHours: number;
    classStrength?: number;
    summary?: string;
    status: TeachingLearningPlanStatus;
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

const TeachingLearningPlanSchema = new Schema<ITeachingLearningPlan>(
    {
        academicYearId: {
            type: Schema.Types.ObjectId,
            ref: "AcademicYear",
            required: true,
            index: true,
        },
        programId: { type: Schema.Types.ObjectId, ref: "Program", required: true, index: true },
        courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
        semesterId: { type: Schema.Types.ObjectId, ref: "Semester", required: true, index: true },
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", index: true },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        facultyOwnerUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
        sourceTeachingLoadId: { type: Schema.Types.ObjectId, ref: "FacultyTeachingLoad", index: true },
        title: { type: String, required: true, trim: true },
        sectionName: { type: String, trim: true, uppercase: true, default: undefined },
        deliveryType: {
            type: String,
            enum: teachingLearningDeliveryTypeValues,
            required: true,
            default: "Theory",
            index: true,
        },
        plannedSessions: { type: Number, required: true, min: 0, default: 0 },
        plannedContactHours: { type: Number, required: true, min: 0, default: 0 },
        classStrength: { type: Number, min: 0 },
        summary: { type: String, trim: true },
        status: {
            type: String,
            enum: teachingLearningPlanStatusValues,
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
    { timestamps: true, collection: "teaching_learning_plans" }
);

TeachingLearningPlanSchema.index(
    { academicYearId: 1, programId: 1, courseId: 1, semesterId: 1, sectionName: 1 },
    { unique: true }
);
TeachingLearningPlanSchema.index({ departmentId: 1, status: 1, updatedAt: -1 });

const TeachingLearningPlan: Model<ITeachingLearningPlan> =
    mongoose.models.TeachingLearningPlan ||
    mongoose.model<ITeachingLearningPlan>("TeachingLearningPlan", TeachingLearningPlanSchema);

export default TeachingLearningPlan;
