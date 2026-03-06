import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IFacultyValidityCheck extends Document {
    userId: Types.ObjectId;
    researchPaper: boolean;
    postHeld: boolean;
    lectures: boolean;
    conferencesSemiWorkshopOrganized: boolean;
    responsibilities: boolean;
    researchProject: boolean;
    pgDessertation: boolean;
    researchGuidance: boolean;
    eContentDeveloped: boolean;
    invitedTalk: boolean;
    jrfSrf: boolean;
    qualification: boolean;
    degree: boolean;
    priorAppointment: boolean;
    online: boolean;
    financialSupport: boolean;
    patent: boolean;
    consultancyServices: boolean;
    collaboration: boolean;
    awardRecognition: boolean;
    fellowship: boolean;
    policyDocuments: boolean;
    foreignVisit: boolean;
    publicationCitation: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyValidityCheckSchema = new Schema<IFacultyValidityCheck>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "FacultyUser",
            unique: true,
            index: true,
        },
        researchPaper: { type: Boolean, default: false },
        postHeld: { type: Boolean, default: false },
        lectures: { type: Boolean, default: false },
        conferencesSemiWorkshopOrganized: { type: Boolean, default: false },
        responsibilities: { type: Boolean, default: false },
        researchProject: { type: Boolean, default: false },
        pgDessertation: { type: Boolean, default: false },
        researchGuidance: { type: Boolean, default: false },
        eContentDeveloped: { type: Boolean, default: false },
        invitedTalk: { type: Boolean, default: false },
        jrfSrf: { type: Boolean, default: false },
        qualification: { type: Boolean, default: false },
        degree: { type: Boolean, default: false },
        priorAppointment: { type: Boolean, default: false },
        online: { type: Boolean, default: false },
        financialSupport: { type: Boolean, default: false },
        patent: { type: Boolean, default: false },
        consultancyServices: { type: Boolean, default: false },
        collaboration: { type: Boolean, default: false },
        awardRecognition: { type: Boolean, default: false },
        fellowship: { type: Boolean, default: false },
        policyDocuments: { type: Boolean, default: false },
        foreignVisit: { type: Boolean, default: false },
        publicationCitation: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        collection: "facultyvaliditychecks",
    }
);

const FacultyValidityCheck: Model<IFacultyValidityCheck> =
    mongoose.models.FacultyValidityCheck ||
    mongoose.model<IFacultyValidityCheck>(
        "FacultyValidityCheck",
        FacultyValidityCheckSchema
    );

export default FacultyValidityCheck;
