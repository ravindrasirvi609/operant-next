import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICollaborativeActivity extends Document {
    participantName: string;
    activityTitle: string;
    agencyName: string;
    academicYear: string;
    duration: string;
    activityNature: string;
    proof?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CollaborativeActivitySchema = new Schema<ICollaborativeActivity>(
    {
        participantName: {
            type: String,
            required: [true, "Participant name is required"],
            trim: true,
        },
        activityTitle: {
            type: String,
            required: [true, "Activity title is required"],
            trim: true,
        },
        agencyName: {
            type: String,
            required: [true, "Agency name is required"],
            trim: true,
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        duration: {
            type: String,
            required: [true, "Duration is required"],
        },
        activityNature: {
            type: String,
            required: [true, "Nature of activity is required"],
        },
        proof: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "iilcollaborativeactivities",
    }
);

const CollaborativeActivity: Model<ICollaborativeActivity> =
    mongoose.models.CollaborativeActivity ||
    mongoose.model<ICollaborativeActivity>(
        "CollaborativeActivity",
        CollaborativeActivitySchema
    );

export default CollaborativeActivity;
