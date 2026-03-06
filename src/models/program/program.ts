import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProgram extends Document {
    flyer?: string;
    prefix: string;
    title: string;
    programDate: string;
    photos?: any[];
    arrangedBy: string;
    whoCanParticipate?: string;
    registrationDetails?: string;
    finalRegistrationDate: string;
    venue: string;
    summary: string;
    presenterPhotoURL: string;
    presenterName: string;
    presenterDesignation: string;
    presenterAddress: string;
    presenterSummary: string;
    coordinatorName0: string;
    coordinatorName1: string;
    coordinatorPosition0: string;
    coordinatorPosition1: string;
    coordinatorEmail0: string;
    coordinatorEmail1: string;
    coordinatorPhone0: string;
    coordinatorPhone1: string;
    registrationResponses?: mongoose.Types.ObjectId[];
    programFeedback?: mongoose.Types.ObjectId[];
    acceptingResponses: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ProgramSchema = new Schema<IProgram>(
    {
        flyer: { type: String },
        prefix: { type: String, required: [true, "Prefix is required"] },
        title: { type: String, required: [true, "Title is required"], trim: true },
        programDate: { type: String, required: [true, "Program date is required"] },
        photos: { type: [Schema.Types.Mixed], default: [] },
        arrangedBy: { type: String, required: [true, "Arranged by is required"] },
        whoCanParticipate: { type: String },
        registrationDetails: { type: String },
        finalRegistrationDate: {
            type: String,
            required: [true, "Final registration date is required"],
        },
        venue: { type: String, required: [true, "Venue is required"] },
        summary: { type: String, required: [true, "Summary is required"] },
        // Presenter details
        presenterPhotoURL: {
            type: String,
            required: [true, "Presenter photo URL is required"],
        },
        presenterName: {
            type: String,
            required: [true, "Presenter name is required"],
        },
        presenterDesignation: {
            type: String,
            required: [true, "Presenter designation is required"],
        },
        presenterAddress: {
            type: String,
            required: [true, "Presenter address is required"],
        },
        presenterSummary: {
            type: String,
            required: [true, "Presenter summary is required"],
        },
        // Coordinator details
        coordinatorName0: {
            type: String,
            required: [true, "Coordinator 1 name is required"],
        },
        coordinatorName1: {
            type: String,
            required: [true, "Coordinator 2 name is required"],
        },
        coordinatorPosition0: {
            type: String,
            required: [true, "Coordinator 1 position is required"],
        },
        coordinatorPosition1: {
            type: String,
            required: [true, "Coordinator 2 position is required"],
        },
        coordinatorEmail0: {
            type: String,
            required: [true, "Coordinator 1 email is required"],
        },
        coordinatorEmail1: {
            type: String,
            required: [true, "Coordinator 2 email is required"],
        },
        coordinatorPhone0: {
            type: String,
            required: [true, "Coordinator 1 phone is required"],
        },
        coordinatorPhone1: {
            type: String,
            required: [true, "Coordinator 2 phone is required"],
        },
        registrationResponses: [
            { type: Schema.Types.ObjectId, ref: "ProgramRegistration" },
        ],
        programFeedback: [
            { type: Schema.Types.ObjectId, ref: "ProgramFeedback" },
        ],
        acceptingResponses: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: "programs",
    }
);

const Program: Model<IProgram> =
    mongoose.models.Program || mongoose.model<IProgram>("Program", ProgramSchema);

export default Program;
