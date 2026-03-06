import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPbas extends Document {
    userId: Types.ObjectId;
    submitted: string[];
    casData: string[];
    createdAt: Date;
    updatedAt: Date;
}

const PbasSchema = new Schema<IPbas>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "FacultyUser",
            index: true,
        },
        submitted: {
            type: [String],
            default: [],
        },
        casData: {
            type: [String],
            required: [true, "CAS data is required"],
        },
    },
    {
        timestamps: true,
        collection: "pbas",
    }
);

const Pbas: Model<IPbas> =
    mongoose.models.Pbas || mongoose.model<IPbas>("Pbas", PbasSchema);

export default Pbas;
