import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const leadershipAssignmentTypes = [
    "HOD",
    "PRINCIPAL",
    "IQAC_COORDINATOR",
    "DIRECTOR",
    "OFFICE_HEAD",
] as const;

export type LeadershipAssignmentType = (typeof leadershipAssignmentTypes)[number];

export interface ILeadershipAssignment extends Document {
    userId: Types.ObjectId;
    organizationId: Types.ObjectId;
    assignmentType: LeadershipAssignmentType;
    title?: string;
    organizationName: string;
    organizationType: string;
    universityName?: string;
    collegeName?: string;
    startDate?: Date;
    endDate?: Date;
    isPrimary: boolean;
    isActive: boolean;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const LeadershipAssignmentSchema = new Schema<ILeadershipAssignment>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
        assignmentType: {
            type: String,
            enum: leadershipAssignmentTypes,
            required: true,
            index: true,
        },
        title: { type: String, trim: true },
        organizationName: { type: String, required: true, trim: true, index: true },
        organizationType: { type: String, required: true, trim: true, index: true },
        universityName: { type: String, trim: true, index: true },
        collegeName: { type: String, trim: true, index: true },
        startDate: { type: Date },
        endDate: { type: Date },
        isPrimary: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true, index: true },
        notes: { type: String, trim: true },
    },
    { timestamps: true, collection: "leadership_assignments" }
);

LeadershipAssignmentSchema.index(
    { userId: 1, organizationId: 1, assignmentType: 1 },
    {
        unique: true,
        partialFilterExpression: { isActive: true },
    }
);
LeadershipAssignmentSchema.index({ assignmentType: 1, isActive: 1, organizationName: 1 });

const LeadershipAssignment: Model<ILeadershipAssignment> =
    mongoose.models.LeadershipAssignment ||
    mongoose.model<ILeadershipAssignment>("LeadershipAssignment", LeadershipAssignmentSchema);

export default LeadershipAssignment;
