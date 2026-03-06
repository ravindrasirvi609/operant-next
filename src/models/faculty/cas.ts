import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ICas extends Document {
    userId: Types.ObjectId;
    submitted: string[];
    stage1?: string;
    stage2?: string;
    stage3?: string;
    stage4?: string;
    stage5?: string;
    casDuration?: string;
    casData: string[];
    createdAt: Date;
    updatedAt: Date;
}

const CasSchema = new Schema<ICas>(
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
        stage1: {
            type: String,
        },
        stage2: {
            type: String,
        },
        stage3: {
            type: String,
        },
        stage4: {
            type: String,
        },
        stage5: {
            type: String,
        },
        casDuration: {
            type: String,
        },
        casData: {
            type: [String],
            required: [true, "CAS data is required"],
        },
    },
    {
        timestamps: true,
        collection: "cas",
    }
);

const Cas: Model<ICas> =
    mongoose.models.Cas || mongoose.model<ICas>("Cas", CasSchema);

export default Cas;
