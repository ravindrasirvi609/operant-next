import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IConferencesWorkshop extends Document {
    year?: string;
    fromDate?: string;
    toDate?: string;
    titleOfProgram: string;
    numberOfParticipants: number;
    levelOfProgram?: string;
    uploadProof?: string;
    schoolName: string;
    fundedBy: string;
    userId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ConferencesWorkshopSchema = new Schema<IConferencesWorkshop>(
    {
        year: {
            type: String,
            index: true,
        },
        fromDate: {
            type: String,
        },
        toDate: {
            type: String,
        },
        titleOfProgram: {
            type: String,
            required: [true, "Title of program is required"],
            trim: true,
        },
        numberOfParticipants: {
            type: Number,
            required: [true, "Number of participants is required"],
            min: [0, "Cannot be negative"],
        },
        levelOfProgram: {
            type: String,
            trim: true,
        },
        uploadProof: {
            type: String,
        },
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
        fundedBy: {
            type: String,
            required: [true, "Funding info is required"],
            trim: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
        collection: "conferencessemiworkshoporganizeds", // preserving original collection name
    }
);

const ConferencesWorkshop: Model<IConferencesWorkshop> =
    mongoose.models.ConferencesWorkshop ||
    mongoose.model<IConferencesWorkshop>(
        "ConferencesWorkshop",
        ConferencesWorkshopSchema
    );

export default ConferencesWorkshop;
