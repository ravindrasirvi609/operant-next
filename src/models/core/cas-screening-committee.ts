import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CasCommitteeRole =
    | "department_head"
    | "cas_committee"
    | "admin"
    | "subject_expert"
    | "vc_nominee"
    | "registrar"
    | "member"
    | "chair";

export interface ICasScreeningCommitteeMember extends Document {
    casApplicationId: Types.ObjectId;
    reviewerUserId?: Types.ObjectId;
    committeeMemberName: string;
    designation: string;
    role: CasCommitteeRole;
    reviewerRole?: string;
    stage: "Department Head" | "CAS Committee" | "Admin";
    remarks?: string;
    decision?: string;
    decisionDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const CasScreeningCommitteeMemberSchema = new Schema<ICasScreeningCommitteeMember>(
    {
        casApplicationId: { type: Schema.Types.ObjectId, ref: "CasApplication", required: true, index: true },
        reviewerUserId: { type: Schema.Types.ObjectId, ref: "User" },
        committeeMemberName: { type: String, required: true, trim: true },
        designation: { type: String, required: true, trim: true },
        role: {
            type: String,
            enum: [
                "department_head",
                "cas_committee",
                "admin",
                "subject_expert",
                "vc_nominee",
                "registrar",
                "member",
                "chair",
            ],
            default: "member",
            required: true,
            index: true,
        },
        reviewerRole: { type: String, trim: true },
        stage: {
            type: String,
            enum: ["Department Head", "CAS Committee", "Admin"],
            required: true,
            index: true,
        },
        remarks: { type: String, trim: true },
        decision: { type: String, trim: true },
        decisionDate: { type: Date },
    },
    { timestamps: true, collection: "cas_screening_committee" }
);

CasScreeningCommitteeMemberSchema.index({ casApplicationId: 1, stage: 1, committeeMemberName: 1 });

const CasScreeningCommitteeMember: Model<ICasScreeningCommitteeMember> =
    mongoose.models.CasScreeningCommitteeMember ||
    mongoose.model<ICasScreeningCommitteeMember>(
        "CasScreeningCommitteeMember",
        CasScreeningCommitteeMemberSchema
    );

export default CasScreeningCommitteeMember;
