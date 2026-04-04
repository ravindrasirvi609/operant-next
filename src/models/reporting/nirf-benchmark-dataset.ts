import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface INirfBenchmarkDataset extends Document {
    rankingCycleId: Types.ObjectId;
    institutionName: string;
    parameterCode: string;
    parameterScore: number;
    overallScore: number;
    rankPosition?: number;
    dataSource?: string;
    createdAt: Date;
    updatedAt: Date;
}

const NirfBenchmarkDatasetSchema = new Schema<INirfBenchmarkDataset>(
    {
        rankingCycleId: { type: Schema.Types.ObjectId, ref: "NirfRankingCycle", required: true, index: true },
        institutionName: { type: String, required: true, trim: true },
        parameterCode: { type: String, required: true, trim: true, uppercase: true },
        parameterScore: { type: Number, required: true, default: 0 },
        overallScore: { type: Number, required: true, default: 0 },
        rankPosition: { type: Number, min: 0 },
        dataSource: { type: String, trim: true },
    },
    { timestamps: true, collection: "nirf_benchmark_dataset" }
);

const NirfBenchmarkDataset: Model<INirfBenchmarkDataset> =
    mongoose.models.NirfBenchmarkDataset ||
    mongoose.model<INirfBenchmarkDataset>("NirfBenchmarkDataset", NirfBenchmarkDatasetSchema);

export default NirfBenchmarkDataset;
