import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IConferenceOrganized extends Document {
    programTitle: string;
    schoolName: string;
    fundedBy: string;
    isNational: string;
    noOfParticipants: string;
    year: string;
    proof?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ConferenceOrganizedSchema = new Schema<IConferenceOrganized>(
    {
        programTitle: {
            type: String,
            required: [true, "Program title is required"],
            trim: true,
        },
        schoolName: {
            type: String,
            required: [true, "School name is required"],
            trim: true,
            index: true,
        },
        fundedBy: {
            type: String,
            required: [true, "Funding agency is required"],
            trim: true,
        },
        isNational: {
            type: String,
            required: [true, "Level (National/International) is required"],
        },
        noOfParticipants: {
            type: String,
            required: [true, "Number of participants is required"],
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
        collection: "conferenceorganizeds",
    }
);

const ConferenceOrganized: Model<IConferenceOrganized> =
    mongoose.models.ConferenceOrganized ||
    mongoose.model<IConferenceOrganized>(
        "ConferenceOrganized",
        ConferenceOrganizedSchema
    );

export default ConferenceOrganized;
