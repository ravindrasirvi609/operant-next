import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ICasPromotionHistory extends Document {
    facultyId: Types.ObjectId;
    oldDesignation: string;
    newDesignation: string;
    promotionDate: Date;
    orderDocumentId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CasPromotionHistorySchema = new Schema<ICasPromotionHistory>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty", required: true, index: true },
        oldDesignation: { type: String, required: true, trim: true },
        newDesignation: { type: String, required: true, trim: true },
        promotionDate: { type: Date, required: true, index: true },
        orderDocumentId: { type: Schema.Types.ObjectId, ref: "Document" },
    },
    { timestamps: true, collection: "cas_promotion_history" }
);

CasPromotionHistorySchema.index({ facultyId: 1, promotionDate: -1 });

const CasPromotionHistory: Model<ICasPromotionHistory> =
    mongoose.models.CasPromotionHistory ||
    mongoose.model<ICasPromotionHistory>("CasPromotionHistory", CasPromotionHistorySchema);

export default CasPromotionHistory;

