import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRevenueCorporateTraining extends Document {
    corporateName: string;
    programName: string;
    agencyName: string;
    academicYear: string;
    revenueGenerated: string;
    numberOfTrainees: number;
    proof: string;
    createdAt: Date;
    updatedAt: Date;
}

const RevenueCorporateTrainingSchema = new Schema<IRevenueCorporateTraining>(
    {
        corporateName: {
            type: String,
            required: [true, "Corporate name is required"],
            trim: true,
        },
        programName: {
            type: String,
            required: [true, "Program name is required"],
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
        numberOfTrainees: {
            type: Number,
            required: [true, "Number of trainees is required"],
        },
        proof: {
            type: String,
            required: [true, "Proof is required"],
        },
    },
    {
        timestamps: true,
        collection: "iilrevenuecorporatetrainings",
    }
);

const RevenueCorporateTraining: Model<IRevenueCorporateTraining> =
    mongoose.models.RevenueCorporateTraining ||
    mongoose.model<IRevenueCorporateTraining>(
        "RevenueCorporateTraining",
        RevenueCorporateTrainingSchema
    );

export default RevenueCorporateTraining;
