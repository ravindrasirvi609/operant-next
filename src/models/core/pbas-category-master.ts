import mongoose, { Document, Model, Schema } from "mongoose";

export type PbasCategoryCode = "A" | "B" | "C";

export interface IPbasCategoryMaster extends Document {
    categoryCode: PbasCategoryCode;
    categoryName: string;
    maxScore: number;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const PbasCategoryMasterSchema = new Schema<IPbasCategoryMaster>(
    {
        categoryCode: { type: String, required: true, trim: true, uppercase: true },
        categoryName: { type: String, required: true, trim: true },
        maxScore: { type: Number, required: true, default: 0 },
        displayOrder: { type: Number, required: true, default: 0, index: true },
    },
    { timestamps: true, collection: "pbas_category_master" }
);

PbasCategoryMasterSchema.index({ categoryCode: 1 }, { unique: true });
PbasCategoryMasterSchema.index({ displayOrder: 1, categoryCode: 1 });

const PbasCategoryMaster: Model<IPbasCategoryMaster> =
    mongoose.models.PbasCategoryMaster ||
    mongoose.model<IPbasCategoryMaster>("PbasCategoryMaster", PbasCategoryMasterSchema);

export default PbasCategoryMaster;
