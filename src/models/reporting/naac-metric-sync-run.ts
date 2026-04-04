import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type NaacMetricSyncRunStatus = "Running" | "Completed" | "Failed";

export interface INaacMetricSyncRun extends Document {
    cycleId: Types.ObjectId;
    academicYearLabel: string;
    status: NaacMetricSyncRunStatus;
    startedAt: Date;
    completedAt?: Date;
    triggeredById?: Types.ObjectId;
    triggeredByName?: string;
    metricCount: number;
    createdCount: number;
    updatedCount: number;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

const NaacMetricSyncRunSchema = new Schema<INaacMetricSyncRun>(
    {
        cycleId: { type: Schema.Types.ObjectId, ref: "NaacMetricCycle", required: true, index: true },
        academicYearLabel: { type: String, required: true, trim: true, index: true },
        status: {
            type: String,
            enum: ["Running", "Completed", "Failed"],
            required: true,
            default: "Running",
            index: true,
        },
        startedAt: { type: Date, required: true, default: Date.now },
        completedAt: { type: Date },
        triggeredById: { type: Schema.Types.ObjectId, ref: "User" },
        triggeredByName: { type: String, trim: true },
        metricCount: { type: Number, default: 0, min: 0 },
        createdCount: { type: Number, default: 0, min: 0 },
        updatedCount: { type: Number, default: 0, min: 0 },
        errorMessage: { type: String, trim: true },
    },
    { timestamps: true, collection: "naac_metric_sync_runs" }
);

NaacMetricSyncRunSchema.index({ cycleId: 1, startedAt: -1 });

const NaacMetricSyncRun: Model<INaacMetricSyncRun> =
    mongoose.models.NaacMetricSyncRun ||
    mongoose.model<INaacMetricSyncRun>("NaacMetricSyncRun", NaacMetricSyncRunSchema);

export default NaacMetricSyncRun;
