import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ISsrNarrativeSection extends Document {
    cycleId: Types.ObjectId;
    criterionId: Types.ObjectId;
    metricId: Types.ObjectId;
    sectionKey: string;
    title: string;
    prompt: string;
    guidance?: string;
    wordLimitMin?: number;
    wordLimitMax?: number;
    displayOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SsrNarrativeSectionSchema = new Schema<ISsrNarrativeSection>(
    {
        cycleId: { type: Schema.Types.ObjectId, ref: "SsrCycle", required: true, index: true },
        criterionId: { type: Schema.Types.ObjectId, ref: "SsrCriterion", required: true, index: true },
        metricId: { type: Schema.Types.ObjectId, ref: "SsrMetric", required: true, index: true },
        sectionKey: { type: String, required: true, trim: true },
        title: { type: String, required: true, trim: true },
        prompt: { type: String, required: true, trim: true },
        guidance: { type: String, trim: true },
        wordLimitMin: { type: Number, min: 0 },
        wordLimitMax: { type: Number, min: 0 },
        displayOrder: { type: Number, required: true, default: 1 },
        isActive: { type: Boolean, required: true, default: true, index: true },
    },
    { timestamps: true, collection: "ssr_narrative_sections" }
);

SsrNarrativeSectionSchema.index({ metricId: 1, sectionKey: 1 }, { unique: true });
SsrNarrativeSectionSchema.index({ metricId: 1, displayOrder: 1 });

const SsrNarrativeSection: Model<ISsrNarrativeSection> =
    mongoose.models.SsrNarrativeSection ||
    mongoose.model<ISsrNarrativeSection>("SsrNarrativeSection", SsrNarrativeSectionSchema);

export default SsrNarrativeSection;
