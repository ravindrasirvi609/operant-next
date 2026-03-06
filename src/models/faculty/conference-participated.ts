import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IConferenceParticipated extends Document {
    programTitle: string;
    organizingInstitute: string;
    isNational: string;
    year: string;
    proof?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ConferenceParticipatedSchema = new Schema<IConferenceParticipated>(
    {
        programTitle: {
            type: String,
            required: [true, "Program title is required"],
            trim: true,
        },
        organizingInstitute: {
            type: String,
            required: [true, "Organizing institute is required"],
            trim: true,
        },
        isNational: {
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
        collection: "conferenceparticipateds",
    }
);

const ConferenceParticipated: Model<IConferenceParticipated> =
    mongoose.models.ConferenceParticipated ||
    mongoose.model<IConferenceParticipated>(
        "ConferenceParticipated",
        ConferenceParticipatedSchema
    );

export default ConferenceParticipated;
