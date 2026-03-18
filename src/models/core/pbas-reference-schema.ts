import { Schema, Types } from "mongoose";

export interface IPbasDraftReferences {
    teachingSummaryId?: Types.ObjectId;
    teachingLoadIds: Types.ObjectId[];
    publicationIds: Types.ObjectId[];
    bookIds: Types.ObjectId[];
    patentIds: Types.ObjectId[];
    researchProjectIds: Types.ObjectId[];
    eventParticipationIds: Types.ObjectId[];
    adminRoleIds: Types.ObjectId[];
    institutionalContributionIds: Types.ObjectId[];
    socialExtensionIds: Types.ObjectId[];
}

export const PbasDraftReferencesSchema = new Schema<IPbasDraftReferences>(
    {
        teachingSummaryId: { type: Schema.Types.ObjectId, ref: "FacultyTeachingSummary" },
        teachingLoadIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyTeachingLoad" }], default: [] },
        publicationIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyPublication" }], default: [] },
        bookIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyBook" }], default: [] },
        patentIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyPatent" }], default: [] },
        researchProjectIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyResearchProject" }], default: [] },
        eventParticipationIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyEventParticipation" }], default: [] },
        adminRoleIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyAdminRole" }], default: [] },
        institutionalContributionIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyInstitutionalContribution" }], default: [] },
        socialExtensionIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultySocialExtension" }], default: [] },
    },
    { _id: false }
);
