import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAisheStaffStatistic extends Document {
    surveyCycleId: Types.ObjectId;
    adminStaffCount: number;
    technicalStaffCount: number;
    libraryStaffCount: number;
    supportStaffCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const AisheStaffStatisticSchema = new Schema<IAisheStaffStatistic>(
    {
        surveyCycleId: { type: Schema.Types.ObjectId, ref: "AisheSurveyCycle", required: true, unique: true, index: true },
        adminStaffCount: { type: Number, min: 0, default: 0 },
        technicalStaffCount: { type: Number, min: 0, default: 0 },
        libraryStaffCount: { type: Number, min: 0, default: 0 },
        supportStaffCount: { type: Number, min: 0, default: 0 },
    },
    { timestamps: true, collection: "aishe_staff_statistics" }
);

const AisheStaffStatistic: Model<IAisheStaffStatistic> =
    mongoose.models.AisheStaffStatistic ||
    mongoose.model<IAisheStaffStatistic>("AisheStaffStatistic", AisheStaffStatisticSchema);

export default AisheStaffStatistic;
