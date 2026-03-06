import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ICollaboration extends Document {
    collabTitle: string;
    agencyName: string;
    participantName: string;
    collabYear: string;
    duration: string;
    activityNature: string;
    year: string;
    proof?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CollaborationSchema = new Schema<ICollaboration>(
    {
        collabTitle: {
            type: String,
            required: [true, "Collaboration title is required"],
            trim: true,
        },
        agencyName: {
            type: String,
            required: [true, "Agency name is required"],
            trim: true,
        },
        participantName: {
            type: String,
            required: [true, "Participant name is required"],
            trim: true,
        },
        collabYear: {
            type: String,
            required: [true, "Collaboration year is required"],
        },
        duration: {
            type: String,
            required: [true, "Duration is required"],
        },
        activityNature: {
            type: String,
            required: [true, "Nature of activity is required"],
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
        collection: "collaborations",
    }
);

const Collaboration: Model<ICollaboration> =
    mongoose.models.Collaboration ||
    mongoose.model<ICollaboration>("Collaboration", CollaborationSchema);

export default Collaboration;
