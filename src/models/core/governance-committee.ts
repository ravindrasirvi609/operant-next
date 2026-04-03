import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const governanceCommitteeTypes = [
    "IQAC",
    "PBAS_REVIEW",
    "CAS_SCREENING",
    "AQAR_REVIEW",
    "SSR_REVIEW",
    "TEACHING_LEARNING_REVIEW",
    "INFRASTRUCTURE_LIBRARY_REVIEW",
    "STUDENT_SUPPORT_GOVERNANCE_REVIEW",
    "BOARD_OF_STUDIES",
    "NAAC_CELL",
    "RESEARCH_COMMITTEE",
    "ANTI_RAGGING",
    "OTHER",
] as const;

export const governanceCommitteeScopeTypes = [
    "InstitutionWide",
    "University",
    "College",
    "Department",
    "Center",
    "Office",
] as const;

export type GovernanceCommitteeType = (typeof governanceCommitteeTypes)[number];
export type GovernanceCommitteeScopeType = (typeof governanceCommitteeScopeTypes)[number];

export interface IGovernanceCommittee extends Document {
    name: string;
    code?: string;
    committeeType: GovernanceCommitteeType;
    scopeType: GovernanceCommitteeScopeType;
    organizationId?: Types.ObjectId;
    organizationName?: string;
    organizationType?: string;
    universityName?: string;
    collegeName?: string;
    academicYearLabel?: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const GovernanceCommitteeSchema = new Schema<IGovernanceCommittee>(
    {
        name: { type: String, required: true, trim: true, index: true },
        code: { type: String, trim: true },
        committeeType: {
            type: String,
            enum: governanceCommitteeTypes,
            required: true,
            index: true,
        },
        scopeType: {
            type: String,
            enum: governanceCommitteeScopeTypes,
            required: true,
            index: true,
        },
        organizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
        organizationName: { type: String, trim: true, index: true },
        organizationType: { type: String, trim: true, index: true },
        universityName: { type: String, trim: true, index: true },
        collegeName: { type: String, trim: true, index: true },
        academicYearLabel: { type: String, trim: true, index: true },
        description: { type: String, trim: true },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true, collection: "governance_committees" }
);

GovernanceCommitteeSchema.index(
    { committeeType: 1, organizationId: 1, academicYearLabel: 1, name: 1 },
    {
        unique: true,
        partialFilterExpression: { isActive: true },
    }
);

const GovernanceCommittee: Model<IGovernanceCommittee> =
    mongoose.models.GovernanceCommittee ||
    mongoose.model<IGovernanceCommittee>("GovernanceCommittee", GovernanceCommitteeSchema);

export default GovernanceCommittee;
