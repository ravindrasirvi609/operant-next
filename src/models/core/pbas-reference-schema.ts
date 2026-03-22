import { Schema, Types } from "mongoose";

export interface IPbasDraftReferences {
    teachingSummaryId?: Types.ObjectId;
    teachingLoadIds: Types.ObjectId[];
    resultSummaryIds: Types.ObjectId[];
    publicationIds: Types.ObjectId[];
    bookIds: Types.ObjectId[];
    patentIds: Types.ObjectId[];
    researchProjectIds: Types.ObjectId[];
    eventParticipationIds: Types.ObjectId[];
    fdpIds: Types.ObjectId[];
    moocCourseIds: Types.ObjectId[];
    econtentIds: Types.ObjectId[];
    phdGuidanceIds: Types.ObjectId[];
    awardIds: Types.ObjectId[];
    consultancyIds: Types.ObjectId[];
    adminRoleIds: Types.ObjectId[];
    institutionalContributionIds: Types.ObjectId[];
    socialExtensionIds: Types.ObjectId[];
}

export const PbasDraftReferencesSchema = new Schema<IPbasDraftReferences>(
    {
        teachingSummaryId: { type: Schema.Types.ObjectId, ref: "FacultyTeachingSummary" },
        teachingLoadIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyTeachingLoad" }], default: [] },
        resultSummaryIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyResultSummary" }], default: [] },
        publicationIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyPublication" }], default: [] },
        bookIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyBook" }], default: [] },
        patentIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyPatent" }], default: [] },
        researchProjectIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyResearchProject" }], default: [] },
        eventParticipationIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyEventParticipation" }], default: [] },
        fdpIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyFdpConducted" }], default: [] },
        moocCourseIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyMoocCourse" }], default: [] },
        econtentIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyEcontent" }], default: [] },
        phdGuidanceIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyPhdGuidance" }], default: [] },
        awardIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyAward" }], default: [] },
        consultancyIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyConsultancy" }], default: [] },
        adminRoleIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyAdminRole" }], default: [] },
        institutionalContributionIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultyInstitutionalContribution" }], default: [] },
        socialExtensionIds: { type: [{ type: Schema.Types.ObjectId, ref: "FacultySocialExtension" }], default: [] },
    },
    { _id: false }
);
