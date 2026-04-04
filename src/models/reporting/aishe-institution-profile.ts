import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const aisheInstitutionTypeValues = ["Government", "Private", "Deemed", "Aided", "Autonomous"] as const;
export const aisheLocationTypeValues = ["Urban", "Rural", "SemiUrban"] as const;

export type AisheInstitutionType = (typeof aisheInstitutionTypeValues)[number];
export type AisheLocationType = (typeof aisheLocationTypeValues)[number];

export interface IAisheInstitutionProfile extends Document {
    surveyCycleId: Types.ObjectId;
    institutionId: Types.ObjectId;
    establishmentYear?: number;
    institutionType?: AisheInstitutionType;
    affiliatingUniversity?: string;
    campusAreaAcres?: number;
    totalBuiltupAreaSqft?: number;
    locationType?: AisheLocationType;
    naacGrade?: string;
    nirfRank?: number;
    createdAt: Date;
    updatedAt: Date;
}

const AisheInstitutionProfileSchema = new Schema<IAisheInstitutionProfile>(
    {
        surveyCycleId: { type: Schema.Types.ObjectId, ref: "AisheSurveyCycle", required: true, unique: true, index: true },
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
        establishmentYear: { type: Number, min: 1900 },
        institutionType: { type: String, enum: aisheInstitutionTypeValues },
        affiliatingUniversity: { type: String, trim: true },
        campusAreaAcres: { type: Number, min: 0 },
        totalBuiltupAreaSqft: { type: Number, min: 0 },
        locationType: { type: String, enum: aisheLocationTypeValues },
        naacGrade: { type: String, trim: true },
        nirfRank: { type: Number, min: 0 },
    },
    { timestamps: true, collection: "aishe_institution_profile" }
);

const AisheInstitutionProfile: Model<IAisheInstitutionProfile> =
    mongoose.models.AisheInstitutionProfile ||
    mongoose.model<IAisheInstitutionProfile>("AisheInstitutionProfile", AisheInstitutionProfileSchema);

export default AisheInstitutionProfile;
