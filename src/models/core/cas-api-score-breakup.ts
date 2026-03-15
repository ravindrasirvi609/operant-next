import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ICasApiScoreBreakup extends Document {
    casApplicationId: Types.ObjectId;
    categoryCode: string;
    scoreObtained: number;
    minimumRequired: number;
    eligible: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CasApiScoreBreakupSchema = new Schema<ICasApiScoreBreakup>(
    {
        casApplicationId: { type: Schema.Types.ObjectId, ref: "CasApplication", required: true, index: true },
        categoryCode: { type: String, required: true, trim: true, uppercase: true, index: true },
        scoreObtained: { type: Number, required: true, default: 0 },
        minimumRequired: { type: Number, required: true, default: 0 },
        eligible: { type: Boolean, default: false, index: true },
    },
    { timestamps: true, collection: "cas_api_score_breakup" }
);

CasApiScoreBreakupSchema.index({ casApplicationId: 1, categoryCode: 1 }, { unique: true });

const CasApiScoreBreakup: Model<ICasApiScoreBreakup> =
    mongoose.models.CasApiScoreBreakup ||
    mongoose.model<ICasApiScoreBreakup>("CasApiScoreBreakup", CasApiScoreBreakupSchema);

export default CasApiScoreBreakup;

