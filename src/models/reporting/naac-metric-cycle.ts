import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type NaacMetricCycleStatus = "Draft" | "Generated" | "Locked";

export interface INaacMetricCycle extends Document {
    academicYearId?: Types.ObjectId;
    academicYearLabel: string;
    title: string;
    status: NaacMetricCycleStatus;
    generatedMetricCount: number;
    reviewedMetricCount: number;
    overriddenMetricCount: number;
    lastGeneratedAt?: Date;
    preparedById?: Types.ObjectId;
    preparedByName?: string;
    createdAt: Date;
    updatedAt: Date;
}

const NaacMetricCycleSchema = new Schema<INaacMetricCycle>(
    {
        academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", sparse: true, unique: true, index: true },
        academicYearLabel: { type: String, required: true, trim: true, unique: true, index: true },
        title: { type: String, required: true, trim: true },
        status: {
            type: String,
            enum: ["Draft", "Generated", "Locked"],
            required: true,
            default: "Draft",
            index: true,
        },
        generatedMetricCount: { type: Number, default: 0, min: 0 },
        reviewedMetricCount: { type: Number, default: 0, min: 0 },
        overriddenMetricCount: { type: Number, default: 0, min: 0 },
        lastGeneratedAt: { type: Date },
        preparedById: { type: Schema.Types.ObjectId, ref: "User" },
        preparedByName: { type: String, trim: true },
    },
    { timestamps: true, collection: "naac_metric_cycles" }
);

NaacMetricCycleSchema.index({ status: 1, updatedAt: -1 });

const NaacMetricCycle: Model<INaacMetricCycle> =
    mongoose.models.NaacMetricCycle ||
    mongoose.model<INaacMetricCycle>("NaacMetricCycle", NaacMetricCycleSchema);

export default NaacMetricCycle;
