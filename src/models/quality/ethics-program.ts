import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const ethicsRecordTypeValues = [
    "Program",
    "CodeOfConduct",
] as const;

export const ethicsProgramCategoryValues = [
    "ProfessionalEthics",
    "ConstitutionalValues",
    "HumanValues",
    "CodeOfConduct",
    "Other",
] as const;

export const ethicsRecordStatusValues = [
    "Active",
    "Planned",
    "Reviewed",
    "Archived",
] as const;

export const ethicsStakeholderTypeValues = [
    "Student",
    "Faculty",
    "Admin",
    "All",
] as const;

export type EthicsRecordType = (typeof ethicsRecordTypeValues)[number];
export type EthicsProgramCategory = (typeof ethicsProgramCategoryValues)[number];
export type EthicsRecordStatus = (typeof ethicsRecordStatusValues)[number];
export type EthicsStakeholderType = (typeof ethicsStakeholderTypeValues)[number];

export interface IEthicsProgram extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    recordType: EthicsRecordType;
    title: string;
    programCategory: EthicsProgramCategory;
    programDate?: Date;
    targetAudience?: string;
    stakeholderType: EthicsStakeholderType;
    effectiveDate?: Date;
    reviewCycleYears?: number;
    status: EthicsRecordStatus;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const EthicsProgramSchema = new Schema<IEthicsProgram>(
    {
        planId: {
            type: Schema.Types.ObjectId,
            ref: "InstitutionalValuesBestPracticesPlan",
            required: true,
            index: true,
        },
        assignmentId: {
            type: Schema.Types.ObjectId,
            ref: "InstitutionalValuesBestPracticesAssignment",
            required: true,
            index: true,
        },
        recordType: {
            type: String,
            enum: ethicsRecordTypeValues,
            required: true,
            default: "Program",
            index: true,
        },
        title: { type: String, required: true, trim: true },
        programCategory: {
            type: String,
            enum: ethicsProgramCategoryValues,
            required: true,
            default: "ProfessionalEthics",
            index: true,
        },
        programDate: { type: Date },
        targetAudience: { type: String, trim: true },
        stakeholderType: {
            type: String,
            enum: ethicsStakeholderTypeValues,
            required: true,
            default: "All",
            index: true,
        },
        effectiveDate: { type: Date },
        reviewCycleYears: { type: Number, min: 0, max: 20 },
        status: {
            type: String,
            enum: ethicsRecordStatusValues,
            required: true,
            default: "Active",
            index: true,
        },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "ethics_programs" }
);

EthicsProgramSchema.index({
    assignmentId: 1,
    displayOrder: 1,
    recordType: 1,
    title: 1,
});

const EthicsProgram: Model<IEthicsProgram> =
    mongoose.models.EthicsProgram ||
    mongoose.model<IEthicsProgram>("EthicsProgram", EthicsProgramSchema);

export default EthicsProgram;
