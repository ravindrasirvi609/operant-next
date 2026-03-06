import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDevelopmentProgramNirf extends Document {
    edpMdpCount: number;
    participantsCount: number;
    earnings: number;
    earningsInWords?: string;
    academicYear: string;
    school: string;
    createdAt: Date;
    updatedAt: Date;
}

const DevelopmentProgramNirfSchema = new Schema<IDevelopmentProgramNirf>(
    {
        edpMdpCount: {
            type: Number,
            required: [true, "Number of EDP/MDP is required"],
        },
        participantsCount: {
            type: Number,
            required: [true, "Number of participants is required"],
        },
        earnings: {
            type: Number,
            required: [true, "Earnings amount is required"],
        },
        earningsInWords: {
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
        collection: "developmentprogramnirfs",
    }
);

const DevelopmentProgramNirf: Model<IDevelopmentProgramNirf> =
    mongoose.models.DevelopmentProgramNirf ||
    mongoose.model<IDevelopmentProgramNirf>(
        "DevelopmentProgramNirf",
        DevelopmentProgramNirfSchema
    );

export default DevelopmentProgramNirf;
