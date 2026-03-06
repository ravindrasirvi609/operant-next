import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IInvitedTalk extends Document {
    lectureTitle: string;
    seminarTitle: string;
    organizedBy: string;
    talkDate: string;
    isNat: string;
    nature: string;
    year: string;
    proof?: string;
    userId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const InvitedTalkSchema = new Schema<IInvitedTalk>(
    {
        lectureTitle: {
            type: String,
            required: [true, "Lecture title is required"],
            trim: true,
        },
        seminarTitle: {
            type: String,
            required: [true, "Seminar title is required"],
            trim: true,
        },
        organizedBy: {
            type: String,
            required: [true, "Organizer name is required"],
            trim: true,
        },
        talkDate: {
            type: String,
            required: [true, "Talk date is required"],
        },
        isNat: {
            type: String,
            required: [true, "Level (National/International) is required"],
        },
        nature: {
            type: String,
            required: [true, "Nature of talk is required"],
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
        collection: "invitedtalks",
    }
);

const InvitedTalk: Model<IInvitedTalk> =
    mongoose.models.InvitedTalk ||
    mongoose.model<IInvitedTalk>("InvitedTalk", InvitedTalkSchema);

export default InvitedTalk;
