import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const governanceCommitteeMemberRoles = [
    "Chair",
    "Secretary",
    "Convenor",
    "Member",
    "ExternalExpert",
] as const;

export type GovernanceCommitteeMemberRole = (typeof governanceCommitteeMemberRoles)[number];

export interface IGovernanceCommitteeMembership extends Document {
    committeeId: Types.ObjectId;
    userId?: Types.ObjectId;
    memberName: string;
    memberEmail?: string;
    memberRole: GovernanceCommitteeMemberRole;
    isExternal: boolean;
    startDate?: Date;
    endDate?: Date;
    isActive: boolean;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const GovernanceCommitteeMembershipSchema = new Schema<IGovernanceCommitteeMembership>(
    {
        committeeId: { type: Schema.Types.ObjectId, ref: "GovernanceCommittee", required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
        memberName: { type: String, required: true, trim: true },
        memberEmail: { type: String, trim: true, lowercase: true },
        memberRole: {
            type: String,
            enum: governanceCommitteeMemberRoles,
            required: true,
            default: "Member",
            index: true,
        },
        isExternal: { type: Boolean, default: false, index: true },
        startDate: { type: Date },
        endDate: { type: Date },
        isActive: { type: Boolean, default: true, index: true },
        notes: { type: String, trim: true },
    },
    { timestamps: true, collection: "governance_committee_memberships" }
);

GovernanceCommitteeMembershipSchema.index(
    { committeeId: 1, userId: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: { isActive: true, userId: { $exists: true } },
    }
);
GovernanceCommitteeMembershipSchema.index({ committeeId: 1, isActive: 1, memberRole: 1 });

const GovernanceCommitteeMembership: Model<IGovernanceCommitteeMembership> =
    mongoose.models.GovernanceCommitteeMembership ||
    mongoose.model<IGovernanceCommitteeMembership>(
        "GovernanceCommitteeMembership",
        GovernanceCommitteeMembershipSchema
    );

export default GovernanceCommitteeMembership;
