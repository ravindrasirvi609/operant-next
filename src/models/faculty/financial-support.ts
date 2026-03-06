import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IFinancialSupport extends Document {
    nameOfConference: string;
    feeProvider: string;
    amountOfSupport: number;
    pan: string;
    year: string;
    proof?: string;
    studentId?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FinancialSupportSchema = new Schema<IFinancialSupport>(
    {
        nameOfConference: {
            type: String,
            required: [true, "Conference name is required"],
            trim: true,
        },
        feeProvider: {
            type: String,
            required: [true, "Fee provider is required"],
            trim: true,
        },
        amountOfSupport: {
            type: Number,
            required: [true, "Amount of support is required"],
        },
        pan: {
            type: String,
            required: [true, "PAN is required"],
            uppercase: true,
            trim: true,
        },
        year: {
            type: String,
            required: [true, "Year is required"],
            index: true,
        },
        proof: {
            type: String,
        },
        studentId: {
            type: String,
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "FacultyUser",
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "financialsupports",
    }
);

const FinancialSupport: Model<IFinancialSupport> =
    mongoose.models.FinancialSupport ||
    mongoose.model<IFinancialSupport>("FinancialSupport", FinancialSupportSchema);

export default FinancialSupport;
