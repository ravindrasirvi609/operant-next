import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const curriculumBosDecisionTypeValues = [
    "Syllabus Revision",
    "New Course",
    "Change Credit",
    "Outcome Update",
    "Value Added Course",
    "Other",
] as const;

export const curriculumBosDecisionStatusValues = [
    "Proposed",
    "Approved",
    "Implemented",
    "Deferred",
] as const;

export type CurriculumBosDecisionType = (typeof curriculumBosDecisionTypeValues)[number];
export type CurriculumBosDecisionStatus = (typeof curriculumBosDecisionStatusValues)[number];

export interface ICurriculumBosDecision extends Document {
    meetingId: Types.ObjectId;
    curriculumId?: Types.ObjectId;
    curriculumCourseId?: Types.ObjectId;
    decisionTitle: string;
    decisionType: CurriculumBosDecisionType;
    description?: string;
    status: CurriculumBosDecisionStatus;
    implementedAcademicYearId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CurriculumBosDecisionSchema = new Schema<ICurriculumBosDecision>(
    {
        meetingId: { type: Schema.Types.ObjectId, ref: "CurriculumBosMeeting", required: true, index: true },
        curriculumId: { type: Schema.Types.ObjectId, ref: "CurriculumPlan", index: true },
        curriculumCourseId: { type: Schema.Types.ObjectId, ref: "CurriculumCourse", index: true },
        decisionTitle: { type: String, required: true, trim: true },
        decisionType: {
            type: String,
            enum: curriculumBosDecisionTypeValues,
            required: true,
            default: "Other",
            index: true,
        },
        description: { type: String, trim: true },
        status: {
            type: String,
            enum: curriculumBosDecisionStatusValues,
            required: true,
            default: "Proposed",
            index: true,
        },
        implementedAcademicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", index: true },
    },
    { timestamps: true, collection: "bos_decisions" }
);

CurriculumBosDecisionSchema.index({ meetingId: 1, decisionTitle: 1 }, { unique: true });

const CurriculumBosDecision: Model<ICurriculumBosDecision> =
    mongoose.models.CurriculumBosDecision ||
    mongoose.model<ICurriculumBosDecision>("CurriculumBosDecision", CurriculumBosDecisionSchema);

export default CurriculumBosDecision;
