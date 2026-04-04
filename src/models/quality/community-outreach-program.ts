import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const communityOutreachActivityTypeValues = [
    "VillageAdoption",
    "HealthCamp",
    "CleanlinessDrive",
    "AwarenessDrive",
    "NSSExtension",
    "CSRInitiative",
    "Other",
] as const;

export type CommunityOutreachActivityType =
    (typeof communityOutreachActivityTypeValues)[number];

export interface ICommunityOutreachProgram extends Document {
    planId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    activityType: CommunityOutreachActivityType;
    title: string;
    location?: string;
    startDate?: Date;
    endDate?: Date;
    beneficiariesCount?: number;
    studentParticipants?: number;
    facultyParticipants?: number;
    staffParticipants?: number;
    hoursContributed?: number;
    impactSummary?: string;
    documentId?: Types.ObjectId;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const CommunityOutreachProgramSchema = new Schema<ICommunityOutreachProgram>(
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
        activityType: {
            type: String,
            enum: communityOutreachActivityTypeValues,
            required: true,
            default: "VillageAdoption",
            index: true,
        },
        title: { type: String, required: true, trim: true },
        location: { type: String, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        beneficiariesCount: { type: Number, min: 0 },
        studentParticipants: { type: Number, min: 0 },
        facultyParticipants: { type: Number, min: 0 },
        staffParticipants: { type: Number, min: 0 },
        hoursContributed: { type: Number, min: 0 },
        impactSummary: { type: String, trim: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        displayOrder: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true, collection: "community_outreach_programs" }
);

CommunityOutreachProgramSchema.index({
    assignmentId: 1,
    displayOrder: 1,
    activityType: 1,
    title: 1,
});

const CommunityOutreachProgram: Model<ICommunityOutreachProgram> =
    mongoose.models.CommunityOutreachProgram ||
    mongoose.model<ICommunityOutreachProgram>(
        "CommunityOutreachProgram",
        CommunityOutreachProgramSchema
    );

export default CommunityOutreachProgram;
