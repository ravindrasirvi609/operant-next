import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const codeOfConductStakeholderTypeValues = [
    "Student",
    "Faculty",
    "Admin",
    "All",
] as const;

export const codeOfConductStatusValues = [
    "Active",
    "Planned",
    "Reviewed",
    "Archived",
] as const;

export type CodeOfConductStakeholderType =
    (typeof codeOfConductStakeholderTypeValues)[number];
export type CodeOfConductStatus = (typeof codeOfConductStatusValues)[number];

export interface ICodeOfConductRecord extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    title: string;
    stakeholderType: CodeOfConductStakeholderType;
    policyDocumentId?: Types.ObjectId;
    effectiveDate?: Date;
    reviewCycleYears?: number;
    status: CodeOfConductStatus;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const CodeOfConductRecordSchema = new Schema<ICodeOfConductRecord>(
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
        title: { type: String, required: true, trim: true },
        stakeholderType: {
            type: String,
            enum: codeOfConductStakeholderTypeValues,
            required: true,
            default: "All",
            index: true,
        },
        policyDocumentId: { type: Schema.Types.ObjectId, ref: "Document" },
        effectiveDate: { type: Date },
        reviewCycleYears: { type: Number, min: 0, max: 20 },
        status: {
            type: String,
            enum: codeOfConductStatusValues,
            required: true,
            default: "Active",
            index: true,
        },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "code_of_conduct_records" }
);

CodeOfConductRecordSchema.index({
    assignmentId: 1,
    displayOrder: 1,
    stakeholderType: 1,
    title: 1,
});

const CodeOfConductRecord: Model<ICodeOfConductRecord> =
    mongoose.models.CodeOfConductRecord ||
    mongoose.model<ICodeOfConductRecord>(
        "CodeOfConductRecord",
        CodeOfConductRecordSchema
    );

export default CodeOfConductRecord;
