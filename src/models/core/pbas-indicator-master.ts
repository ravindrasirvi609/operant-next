import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IPbasIndicatorMaster extends Document {
    categoryId: Types.ObjectId;
    indicatorCode: string;
    formulaKey?: string;
    indicatorName: string;
    description?: string;
    maxScore: number;
    naacCriteriaCode?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PbasIndicatorMasterSchema = new Schema<IPbasIndicatorMaster>(
    {
        categoryId: { type: Schema.Types.ObjectId, ref: "PbasCategoryMaster", required: true, index: true },
        indicatorCode: { type: String, required: true, trim: true, uppercase: true },
        formulaKey: { type: String, trim: true, uppercase: true },
        indicatorName: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        maxScore: { type: Number, required: true, default: 0 },
        naacCriteriaCode: { type: String, trim: true, uppercase: true },
    },
    { timestamps: true, collection: "pbas_indicator_master" }
);

PbasIndicatorMasterSchema.index({ indicatorCode: 1 }, { unique: true });
PbasIndicatorMasterSchema.index({ formulaKey: 1 }, { unique: true, sparse: true });
PbasIndicatorMasterSchema.index({ categoryId: 1, indicatorCode: 1 });

const PbasIndicatorMaster: Model<IPbasIndicatorMaster> =
    mongoose.models.PbasIndicatorMaster ||
    mongoose.model<IPbasIndicatorMaster>("PbasIndicatorMaster", PbasIndicatorMasterSchema);

export default PbasIndicatorMaster;
