import mongoose, { Schema, Document, Model } from "mongoose";

export interface IIqacAssurance extends Document {
    academicYear: string;
    conferencesSeminarsWorkshops: string;
    aaaFollowUp: string;
    participationNirf: string;
    isoCertification: string;
    nbaOtherCertification: string;
    collaborativeQuality: string;
    fromDate: string;
    toDate: string;
    proof?: string;
    createdAt: Date;
    updatedAt: Date;
}

const IqacAssuranceSchema = new Schema<IIqacAssurance>(
    {
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            index: true,
        },
        conferencesSeminarsWorkshops: {
            type: String,
            required: [true, "Conferences/Seminars/Workshops info is required"],
        },
        aaaFollowUp: {
            type: String,
            required: [true, "AAA follow-up info is required"],
        },
        participationNirf: {
            type: String,
            required: [true, "NIRF participation info is required"],
        },
        isoCertification: {
            type: String,
            required: [true, "ISO certification info is required"],
        },
        nbaOtherCertification: {
            type: String,
            required: [true, "NBA/Other certification info is required"],
        },
        collaborativeQuality: {
            type: String,
            required: [true, "Collaborative quality info is required"],
        },
        fromDate: {
            type: String,
            required: [true, "From date is required"],
        },
        toDate: {
            type: String,
            required: [true, "To date is required"],
        },
        proof: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "iqacinstitutionqualityassurances",
    }
);

const IqacAssurance: Model<IIqacAssurance> =
    mongoose.models.IqacAssurance ||
    mongoose.model<IIqacAssurance>("IqacAssurance", IqacAssuranceSchema);

export default IqacAssurance;
