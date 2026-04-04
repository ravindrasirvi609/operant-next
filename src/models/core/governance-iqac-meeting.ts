import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const governanceIqacMeetingTypeValues = [
    "IQAC",
    "GoverningBody",
    "AcademicCouncil",
    "DepartmentReview",
    "QualityCircle",
    "StrategicPlanning",
    "Other",
] as const;

export type GovernanceIqacMeetingType =
    (typeof governanceIqacMeetingTypeValues)[number];

export interface IGovernanceIqacMeeting extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    meetingType: GovernanceIqacMeetingType;
    title: string;
    meetingDate?: Date;
    chairedBy?: string;
    attendeeCount?: number;
    agendaSummary?: string;
    decisionSummary?: string;
    actionTakenSummary?: string;
    remarks?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const GovernanceIqacMeetingSchema = new Schema<IGovernanceIqacMeeting>(
    {
        planId: {
            type: Schema.Types.ObjectId,
            ref: "GovernanceLeadershipIqacPlan",
            required: true,
            index: true,
        },
        assignmentId: {
            type: Schema.Types.ObjectId,
            ref: "GovernanceLeadershipIqacAssignment",
            required: true,
            index: true,
        },
        meetingType: {
            type: String,
            enum: governanceIqacMeetingTypeValues,
            required: true,
            default: "IQAC",
            index: true,
        },
        title: { type: String, required: true, trim: true },
        meetingDate: { type: Date },
        chairedBy: { type: String, trim: true },
        attendeeCount: { type: Number, min: 0 },
        agendaSummary: { type: String, trim: true },
        decisionSummary: { type: String, trim: true },
        actionTakenSummary: { type: String, trim: true },
        remarks: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "governance_iqac_meetings" }
);

GovernanceIqacMeetingSchema.index({ assignmentId: 1, displayOrder: 1, meetingType: 1, title: 1 });

const GovernanceIqacMeeting: Model<IGovernanceIqacMeeting> =
    mongoose.models.GovernanceIqacMeeting ||
    mongoose.model<IGovernanceIqacMeeting>(
        "GovernanceIqacMeeting",
        GovernanceIqacMeetingSchema
    );

export default GovernanceIqacMeeting;
