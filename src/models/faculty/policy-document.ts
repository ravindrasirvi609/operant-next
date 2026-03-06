import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPolicyDocument extends Document {
    policyName: string;
    organizationName: string;
    isNat: string;
    year: string;
    proof: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PolicyDocumentSchema = new Schema<IPolicyDocument>(
    {
        policyName: {
            type: String,
            required: [true, "Policy name is required"],
            trim: true,
        },
        organizationName: {
            type: String,
            required: [true, "Organization name is required"],
            trim: true,
        },
        isNat: {
            type: String,
            required: [true, "Level (National/International) is required"],
        },
        year: {
            type: String,
            required: [true, "Year is required"],
            index: true,
        },
        proof: {
            type: String,
            required: [true, "Proof is required"],
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
        collection: "policydocuments",
    }
);

const PolicyDocument: Model<IPolicyDocument> =
    mongoose.models.PolicyDocument ||
    mongoose.model<IPolicyDocument>("PolicyDocument", PolicyDocumentSchema);

export default PolicyDocument;
