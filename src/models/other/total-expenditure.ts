import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITotalExpenditure extends Document {
    budgetAllocated?: string;
    expenditureInfrastructure?: string;
    totalExpenditure?: string;
    academicMaintenance?: string;
    physicalMaintenance?: string;
    academicYear: string;
    createdAt: Date;
    updatedAt: Date;
}

const TotalExpenditureSchema = new Schema<ITotalExpenditure>(
    {
        budgetAllocated: {
            type: String,
        },
        expenditureInfrastructure: {
            type: String,
        },
        totalExpenditure: {
            type: String,
        },
        academicMaintenance: {
            type: String,
        },
        physicalMaintenance: {
            type: String,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "totalexpenditures",
    }
);

const TotalExpenditure: Model<ITotalExpenditure> =
    mongoose.models.TotalExpenditure ||
    mongoose.model<ITotalExpenditure>("TotalExpenditure", TotalExpenditureSchema);

export default TotalExpenditure;
