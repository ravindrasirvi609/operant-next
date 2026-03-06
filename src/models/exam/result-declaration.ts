import mongoose, { Schema, Document, Model } from "mongoose";

export interface IResultDeclaration extends Document {
    programmeName?: string;
    programmeCode?: string;
    academicYear: string;
    lastDate?: string;
    declarationDate?: string;
    proof?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ResultDeclarationSchema = new Schema<IResultDeclaration>(
    {
        programmeName: {
            type: String,
            trim: true,
        },
        programmeCode: {
            type: String,
            trim: true,
            uppercase: true,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        lastDate: {
            type: String,
        },
        declarationDate: {
            type: String,
        },
        proof: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "dateofresultdiclarations", // preserving original collection name
    }
);

const ResultDeclaration: Model<IResultDeclaration> =
    mongoose.models.ResultDeclaration ||
    mongoose.model<IResultDeclaration>(
        "ResultDeclaration",
        ResultDeclarationSchema
    );

export default ResultDeclaration;
