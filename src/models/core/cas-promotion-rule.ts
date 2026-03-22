import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICasCategoryMinimums {
    teachingLearning: number;
    researchPublication: number;
    academicContribution: number;
}

export interface ICasPromotionRule extends Document {
    currentDesignation: string;
    targetDesignation: string;
    minExperienceYears: number;
    minApiScore: number;
    categoryMinimums: ICasCategoryMinimums;
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CasCategoryMinimumsSchema = new Schema<ICasCategoryMinimums>(
    {
        teachingLearning: { type: Number, min: 0, default: 0 },
        researchPublication: { type: Number, min: 0, default: 0 },
        academicContribution: { type: Number, min: 0, default: 0 },
    },
    { _id: false }
);

const CasPromotionRuleSchema = new Schema<ICasPromotionRule>(
    {
        currentDesignation: { type: String, required: true, trim: true, index: true },
        targetDesignation: { type: String, required: true, trim: true, index: true },
        minExperienceYears: { type: Number, required: true, min: 0 },
        minApiScore: { type: Number, required: true, min: 0 },
        categoryMinimums: { type: CasCategoryMinimumsSchema, default: () => ({}) },
        notes: { type: String, trim: true },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true, collection: "cas_promotion_rules" }
);

CasPromotionRuleSchema.index({ currentDesignation: 1, targetDesignation: 1 }, { unique: true });

const CasPromotionRule: Model<ICasPromotionRule> =
    mongoose.models.CasPromotionRule ||
    mongoose.model<ICasPromotionRule>("CasPromotionRule", CasPromotionRuleSchema);

export default CasPromotionRule;
