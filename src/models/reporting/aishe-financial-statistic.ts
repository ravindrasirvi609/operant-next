import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAisheFinancialStatistic extends Document {
    surveyCycleId: Types.ObjectId;
    salaryExpenditure: number;
    infrastructureExpenditure: number;
    researchExpenditure: number;
    libraryExpenditure: number;
    studentSupportExpenditure: number;
    totalRevenueReceipts: number;
    totalGrantsReceived: number;
    createdAt: Date;
    updatedAt: Date;
}

const AisheFinancialStatisticSchema = new Schema<IAisheFinancialStatistic>(
    {
        surveyCycleId: { type: Schema.Types.ObjectId, ref: "AisheSurveyCycle", required: true, unique: true, index: true },
        salaryExpenditure: { type: Number, min: 0, default: 0 },
        infrastructureExpenditure: { type: Number, min: 0, default: 0 },
        researchExpenditure: { type: Number, min: 0, default: 0 },
        libraryExpenditure: { type: Number, min: 0, default: 0 },
        studentSupportExpenditure: { type: Number, min: 0, default: 0 },
        totalRevenueReceipts: { type: Number, min: 0, default: 0 },
        totalGrantsReceived: { type: Number, min: 0, default: 0 },
    },
    { timestamps: true, collection: "aishe_financial_statistics" }
);

const AisheFinancialStatistic: Model<IAisheFinancialStatistic> =
    mongoose.models.AisheFinancialStatistic ||
    mongoose.model<IAisheFinancialStatistic>("AisheFinancialStatistic", AisheFinancialStatisticSchema);

export default AisheFinancialStatistic;
