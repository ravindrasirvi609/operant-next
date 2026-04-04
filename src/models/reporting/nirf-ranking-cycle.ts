import mongoose, { Document, Model, Schema } from "mongoose";

export const nirfFrameworkTypeValues = [
    "Overall",
    "Engineering",
    "University",
    "Management",
    "Pharmacy",
    "College",
] as const;
export const nirfRankingCycleStatusValues = ["Preparation", "Submitted", "ResultPublished"] as const;

export type NirfFrameworkType = (typeof nirfFrameworkTypeValues)[number];
export type NirfRankingCycleStatus = (typeof nirfRankingCycleStatusValues)[number];

export interface INirfRankingCycle extends Document {
    rankingYear: number;
    frameworkType: NirfFrameworkType;
    dataSubmissionStart?: Date;
    dataSubmissionEnd?: Date;
    resultDeclaredDate?: Date;
    status: NirfRankingCycleStatus;
    createdAt: Date;
    updatedAt: Date;
}

const NirfRankingCycleSchema = new Schema<INirfRankingCycle>(
    {
        rankingYear: { type: Number, required: true, min: 2000, index: true },
        frameworkType: { type: String, enum: nirfFrameworkTypeValues, required: true, index: true },
        dataSubmissionStart: { type: Date },
        dataSubmissionEnd: { type: Date },
        resultDeclaredDate: { type: Date },
        status: {
            type: String,
            enum: nirfRankingCycleStatusValues,
            required: true,
            default: "Preparation",
            index: true,
        },
    },
    { timestamps: true, collection: "nirf_ranking_cycles" }
);

NirfRankingCycleSchema.index({ rankingYear: 1, frameworkType: 1 }, { unique: true });

const NirfRankingCycle: Model<INirfRankingCycle> =
    mongoose.models.NirfRankingCycle ||
    mongoose.model<INirfRankingCycle>("NirfRankingCycle", NirfRankingCycleSchema);

export default NirfRankingCycle;
