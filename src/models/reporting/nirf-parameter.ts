import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface INirfParameter extends Document {
    rankingCycleId: Types.ObjectId;
    parameterCode: string;
    parameterName: string;
    weightagePercentage: number;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const NirfParameterSchema = new Schema<INirfParameter>(
    {
        rankingCycleId: { type: Schema.Types.ObjectId, ref: "NirfRankingCycle", required: true, index: true },
        parameterCode: { type: String, required: true, trim: true, uppercase: true, index: true },
        parameterName: { type: String, required: true, trim: true },
        weightagePercentage: { type: Number, required: true, min: 0, default: 0 },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "nirf_parameters" }
);

NirfParameterSchema.index({ rankingCycleId: 1, parameterCode: 1 }, { unique: true });

const NirfParameter: Model<INirfParameter> =
    mongoose.models.NirfParameter || mongoose.model<INirfParameter>("NirfParameter", NirfParameterSchema);

export default NirfParameter;
