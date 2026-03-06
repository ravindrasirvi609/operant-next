import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRevenueConsultancy extends Document {
    consultantName: string;
    projectName: string;
    agencyName: string;
    academicYear: string;
    revenueGenerated: string;
    proof: string;
    createdAt: Date;
    updatedAt: Date;
}

const RevenueConsultancySchema = new Schema<IRevenueConsultancy>(
    {
        consultantName: {
            type: String,
            required: [true, "Consultant name is required"],
            trim: true,
        },
        projectName: {
            type: String,
            required: [true, "Project name is required"],
            trim: true,
        },
        agencyName: {
            type: String,
            required: [true, "Agency name is required"],
            trim: true,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        revenueGenerated: {
            type: String,
            required: [true, "Revenue generated is required"],
        },
        proof: {
            type: String,
            required: [true, "Proof is required"],
        },
    },
    {
        timestamps: true,
        collection: "iilrevenueconsultancies",
    }
);

const RevenueConsultancy: Model<IRevenueConsultancy> =
    mongoose.models.RevenueConsultancy ||
    mongoose.model<IRevenueConsultancy>(
        "RevenueConsultancy",
        RevenueConsultancySchema
    );

export default RevenueConsultancy;
