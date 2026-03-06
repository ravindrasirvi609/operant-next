import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAqarSupportingDocs extends Document {
    academicYear: string;
    userType: string;
    school?: string;
    info?: string;
    proofType: string;
    proof?: string;
}

const AqarSupportingDocsSchema = new Schema<IAqarSupportingDocs>(
    {
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        userType: {
            type: String,
            required: [true, "User type is required"],
        },
        school: {
            type: String,
            trim: true,
            index: true,
        },
        info: {
            type: String,
            trim: true,
        },
        proofType: {
            type: String,
            required: [true, "Proof type is required"],
        },
        proof: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "aqarsupportingdocuments",
    }
);

const AqarSupportingDocs: Model<IAqarSupportingDocs> =
    mongoose.models.AqarSupportingDocs ||
    mongoose.model<IAqarSupportingDocs>(
        "AqarSupportingDocs",
        AqarSupportingDocsSchema
    );

export default AqarSupportingDocs;
