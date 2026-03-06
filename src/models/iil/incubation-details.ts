import mongoose, { Schema, Document, Model } from "mongoose";

export interface IIncubationDetails extends Document {
    details: string;
    academicYear: string;
    createdAt: Date;
    updatedAt: Date;
}

const IncubationDetailsSchema = new Schema<IIncubationDetails>(
    {
        details: {
            type: String,
            required: [true, "Details are required"],
            trim: true,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "iilincubationdetails",
    }
);

const IncubationDetails: Model<IIncubationDetails> =
    mongoose.models.IncubationDetails ||
    mongoose.model<IIncubationDetails>("IncubationDetails", IncubationDetailsSchema);

export default IncubationDetails;
