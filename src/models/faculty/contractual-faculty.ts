import mongoose, { Schema, Document, Model } from "mongoose";

export interface IContractualFaculty extends Document {
    userIdCount: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

const ContractualFacultySchema = new Schema<IContractualFaculty>(
    {
        userIdCount: {
            type: Number,
            required: [true, "User ID count is required"],
        },
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: "contractualFacultyID", // preserving original collection name
    }
);

const ContractualFaculty: Model<IContractualFaculty> =
    mongoose.models.ContractualFaculty ||
    mongoose.model<IContractualFaculty>(
        "ContractualFaculty",
        ContractualFacultySchema
    );

export default ContractualFaculty;
