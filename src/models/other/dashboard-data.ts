import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDashboardData extends Document {
    report: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const DashboardDataSchema = new Schema<IDashboardData>(
    {
        report: {
            type: Object,
            default: {},
        },
    },
    {
        timestamps: true,
        collection: "dashboarddatas",
    }
);

const DashboardData: Model<IDashboardData> =
    mongoose.models.DashboardData ||
    mongoose.model<IDashboardData>("DashboardData", DashboardDataSchema);

export default DashboardData;
