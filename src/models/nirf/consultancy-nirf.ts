import mongoose, { Schema, Document, Model } from "mongoose";

export interface IConsultancyNirf extends Document {
    consultancyCount: number;
    clientOrganizationCount: number;
    amountReceived: number;
    amountInWords?: string;
    academicYear: string;
    school: string;
    createdAt: Date;
    updatedAt: Date;
}

const ConsultancyNirfSchema = new Schema<IConsultancyNirf>(
    {
        consultancyCount: {
            type: Number,
            required: [true, "Consultancy count is required"],
        },
        clientOrganizationCount: {
            type: Number,
            required: [true, "Client organization count is required"],
        },
        amountReceived: {
            type: Number,
            required: [true, "Amount received is required"],
        },
        amountInWords: {
            type: String,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        school: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "consultancynirfs",
    }
);

const ConsultancyNirf: Model<IConsultancyNirf> =
    mongoose.models.ConsultancyNirf ||
    mongoose.model<IConsultancyNirf>("ConsultancyNirf", ConsultancyNirfSchema);

export default ConsultancyNirf;
