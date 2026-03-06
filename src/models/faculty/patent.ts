import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPatent extends Document {
    type: string;
    status: string;
    patenterName: string;
    patentNumber: string;
    patentTitle: string;
    isNat: string;
    awardYear: string;
    fieldDate?: string;
    publishedDate?: string;
    year: string;
    proof?: string;
    studentId?: string;
    schoolName?: string;
    guideName?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PatentSchema = new Schema<IPatent>(
    {
        type: {
            type: String,
            required: [true, "Type is required"],
        },
        status: {
            type: String,
            required: [true, "Status is required"],
        },
        patenterName: {
            type: String,
            required: [true, "Patenter name is required"],
            trim: true,
        },
        patentNumber: {
            type: String,
            required: [true, "Patent number is required"],
        },
        patentTitle: {
            type: String,
            required: [true, "Patent title is required"],
            trim: true,
        },
        isNat: {
            type: String,
            required: [true, "Nature is required"],
        },
        awardYear: {
            type: String,
            required: [true, "Award year is required"],
        },
        fieldDate: {
            type: String,
        },
        publishedDate: {
            type: String,
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
        schoolName: {
            type: String,
            index: true,
        },
        guideName: {
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
        collection: "patents",
    }
);

const Patent: Model<IPatent> =
    mongoose.models.Patent || mongoose.model<IPatent>("Patent", PatentSchema);

export default Patent;
