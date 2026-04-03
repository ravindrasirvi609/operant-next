import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const ssrCycleStatusValues = [
    "Draft",
    "Active",
    "Review",
    "Locked",
    "Archived",
] as const;

export type SsrCycleStatus = (typeof ssrCycleStatusValues)[number];

export interface ISsrCycle extends Document {
    institutionId?: Types.ObjectId;
    academicYearId?: Types.ObjectId;
    title: string;
    code: string;
    framework: string;
    description?: string;
    status: SsrCycleStatus;
    submissionWindowStart?: Date;
    submissionWindowEnd?: Date;
    createdBy?: Types.ObjectId;
    activatedAt?: Date;
    lockedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const SsrCycleSchema = new Schema<ISsrCycle>(
    {
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", index: true },
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", index: true },
        title: { type: String, required: true, trim: true },
        code: { type: String, required: true, trim: true, uppercase: true },
        framework: { type: String, required: true, trim: true, default: "NAAC_SSR" },
        description: { type: String, trim: true },
        status: {
            type: String,
            enum: ssrCycleStatusValues,
            default: "Draft",
            required: true,
            index: true,
        },
        submissionWindowStart: { type: Date },
        submissionWindowEnd: { type: Date },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        activatedAt: { type: Date },
        lockedAt: { type: Date },
    },
    { timestamps: true, collection: "ssr_cycles" }
);

SsrCycleSchema.index({ code: 1 }, { unique: true });
SsrCycleSchema.index({ institutionId: 1, academicYearId: 1, status: 1 });

const SsrCycle: Model<ISsrCycle> =
    mongoose.models.SsrCycle ||
    mongoose.model<ISsrCycle>("SsrCycle", SsrCycleSchema);

export default SsrCycle;
