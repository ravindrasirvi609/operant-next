import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const outreachParticipantTypeValues = [
    "Student",
    "Faculty",
    "Staff",
] as const;

export type OutreachParticipantType =
    (typeof outreachParticipantTypeValues)[number];

export interface IOutreachParticipant extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    programId: Types.ObjectId;
    participantType: OutreachParticipantType;
    participantId?: string;
    participantName?: string;
    hoursContributed?: number;
    certificateDocumentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const OutreachParticipantSchema = new Schema<IOutreachParticipant>(
    {
        planId: {
            type: Schema.Types.ObjectId,
            ref: "InstitutionalValuesBestPracticesPlan",
            required: true,
            index: true,
        },
        assignmentId: {
            type: Schema.Types.ObjectId,
            ref: "InstitutionalValuesBestPracticesAssignment",
            required: true,
            index: true,
        },
        programId: {
            type: Schema.Types.ObjectId,
            ref: "CommunityOutreachProgram",
            required: true,
            index: true,
        },
        participantType: {
            type: String,
            enum: outreachParticipantTypeValues,
            required: true,
            default: "Student",
            index: true,
        },
        participantId: { type: String, trim: true },
        participantName: { type: String, trim: true },
        hoursContributed: { type: Number, min: 0 },
        certificateDocumentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "outreach_participants" }
);

OutreachParticipantSchema.index({
    assignmentId: 1,
    programId: 1,
    displayOrder: 1,
    participantType: 1,
});

const OutreachParticipant: Model<IOutreachParticipant> =
    mongoose.models.OutreachParticipant ||
    mongoose.model<IOutreachParticipant>(
        "OutreachParticipant",
        OutreachParticipantSchema
    );

export default OutreachParticipant;
