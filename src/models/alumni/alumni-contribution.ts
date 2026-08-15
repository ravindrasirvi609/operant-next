import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const alumniContributionTypeValues = ["Financial", "NonFinancial"] as const;
export type AlumniContributionType = (typeof alumniContributionTypeValues)[number];

/** NAAC 5.4.2 five-year contribution bands (Manual for Universities, KI 5.4). */
export const alumniContributionBandValues = [
    "Below5Lakhs",
    "5To20Lakhs",
    "20To50Lakhs",
    "50To100Lakhs",
    "Above100Lakhs",
] as const;
export type AlumniContributionBand = (typeof alumniContributionBandValues)[number];

export interface IAlumniContribution extends Document {
    associationId: Types.ObjectId;
    alumniId?: Types.ObjectId;
    alumniName: string;
    contributionType: AlumniContributionType;
    contributionBand: AlumniContributionBand;
    amount?: number;
    purposeDescription?: string;
    contributionYear: number;
    documentId?: Types.ObjectId;
    recordedByUserId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const AlumniContributionSchema = new Schema<IAlumniContribution>(
    {
        associationId: { type: Schema.Types.ObjectId, ref: "AlumniAssociation", required: true, index: true },
        alumniId: { type: Schema.Types.ObjectId, ref: "Alumni" },
        alumniName: { type: String, required: true, trim: true },
        contributionType: {
            type: String,
            enum: alumniContributionTypeValues,
            required: true,
            default: "Financial",
        },
        contributionBand: {
            type: String,
            enum: alumniContributionBandValues,
            required: true,
            index: true,
        },
        amount: { type: Number, min: 0 },
        purposeDescription: { type: String, trim: true },
        contributionYear: { type: Number, required: true, min: 1900, index: true },
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        recordedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true, collection: "alumni_contributions" }
);

AlumniContributionSchema.index({ associationId: 1, contributionYear: -1 });

const AlumniContribution: Model<IAlumniContribution> =
    mongoose.models.AlumniContribution ||
    mongoose.model<IAlumniContribution>("AlumniContribution", AlumniContributionSchema);

export default AlumniContribution;
