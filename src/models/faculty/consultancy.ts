import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IConsultancy extends Document {
    cName: string;
    cProjectName: string;
    cAgency: string;
    cYear: string;
    revenue: string;
    year: string;
    proof?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ConsultancySchema = new Schema<IConsultancy>(
    {
        cName: {
            type: String,
            required: [true, "Consultant name is required"],
            trim: true,
        },
        cProjectName: {
            type: String,
            required: [true, "Project name is required"],
            trim: true,
        },
        cAgency: {
            type: String,
            required: [true, "Agency name is required"],
            trim: true,
        },
        cYear: {
            type: String,
            required: [true, "Consultancy year is required"],
        },
        revenue: {
            type: String,
            required: [true, "Revenue details are required"],
        },
        year: {
            type: String,
            required: [true, "Year is required"],
            index: true,
        },
        proof: {
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
        collection: "consultancyservices",
    }
);

const Consultancy: Model<IConsultancy> =
    mongoose.models.Consultancy ||
    mongoose.model<IConsultancy>("Consultancy", ConsultancySchema);

export default Consultancy;
