import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAisheInfrastructureStatistic extends Document {
    surveyCycleId: Types.ObjectId;
    totalClassrooms: number;
    totalLaboratories: number;
    totalSeminarHalls: number;
    totalComputers: number;
    internetBandwidthMbps: number;
    libraryBooks: number;
    libraryJournals: number;
    hostelCapacityBoys: number;
    hostelCapacityGirls: number;
    sportsFacilitiesCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const AisheInfrastructureStatisticSchema = new Schema<IAisheInfrastructureStatistic>(
    {
        surveyCycleId: { type: Schema.Types.ObjectId, ref: "AisheSurveyCycle", required: true, unique: true, index: true },
        totalClassrooms: { type: Number, min: 0, default: 0 },
        totalLaboratories: { type: Number, min: 0, default: 0 },
        totalSeminarHalls: { type: Number, min: 0, default: 0 },
        totalComputers: { type: Number, min: 0, default: 0 },
        internetBandwidthMbps: { type: Number, min: 0, default: 0 },
        libraryBooks: { type: Number, min: 0, default: 0 },
        libraryJournals: { type: Number, min: 0, default: 0 },
        hostelCapacityBoys: { type: Number, min: 0, default: 0 },
        hostelCapacityGirls: { type: Number, min: 0, default: 0 },
        sportsFacilitiesCount: { type: Number, min: 0, default: 0 },
    },
    { timestamps: true, collection: "aishe_infrastructure_statistics" }
);

const AisheInfrastructureStatistic: Model<IAisheInfrastructureStatistic> =
    mongoose.models.AisheInfrastructureStatistic ||
    mongoose.model<IAisheInfrastructureStatistic>("AisheInfrastructureStatistic", AisheInfrastructureStatisticSchema);

export default AisheInfrastructureStatistic;
