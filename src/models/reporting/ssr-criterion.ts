import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ISsrCriterion extends Document {
    cycleId: Types.ObjectId;
    criterionCode: string;
    title: string;
    description?: string;
    weightage?: number;
    displayOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SsrCriterionSchema = new Schema<ISsrCriterion>(
    {
        cycleId: { type: Schema.Types.ObjectId, ref: "SsrCycle", required: true, index: true },
        criterionCode: { type: String, required: true, trim: true, uppercase: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        weightage: { type: Number, min: 0 },
        displayOrder: { type: Number, required: true, default: 1 },
        isActive: { type: Boolean, required: true, default: true, index: true },
    },
    { timestamps: true, collection: "ssr_criteria" }
);

SsrCriterionSchema.index({ cycleId: 1, criterionCode: 1 }, { unique: true });
SsrCriterionSchema.index({ cycleId: 1, displayOrder: 1 });

const SsrCriterion: Model<ISsrCriterion> =
    mongoose.models.SsrCriterion ||
    mongoose.model<ISsrCriterion>("SsrCriterion", SsrCriterionSchema);

export default SsrCriterion;
