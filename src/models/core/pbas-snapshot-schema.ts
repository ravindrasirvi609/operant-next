import { Schema } from "mongoose";

export interface IPbasResearchPaper {
    title: string;
    journal: string;
    year: number;
    issn?: string;
    indexing?: string;
}

export interface IPbasBook {
    title: string;
    publisher: string;
    isbn?: string;
    year: number;
}

export interface IPbasPatent {
    title: string;
    year: number;
    status: string;
}

export interface IPbasConference {
    title: string;
    organizer: string;
    year: number;
    type: string;
}

export interface IPbasProject {
    title: string;
    fundingAgency: string;
    amount: number;
    year: number;
}

export interface IPbasCommittee {
    committeeName: string;
    role?: string;
    year?: number;
}

export interface IPbasAdministrativeDuty {
    title: string;
    year?: number;
}

export interface IPbasExamDuty {
    duty: string;
    year?: number;
}

export interface IPbasStudentGuidance {
    activity: string;
    count: number;
}

export interface IPbasExtensionActivity {
    title: string;
    role?: string;
    year?: number;
}

export interface IPbasApiScore {
    teachingActivities: number;
    researchAcademicContribution: number;
    institutionalResponsibilities: number;
    totalScore: number;
}

export interface IPbasCategory1Snapshot {
    classesTaken: number;
    coursePreparationHours: number;
    coursesTaught: string[];
    mentoringCount: number;
    labSupervisionCount: number;
    feedbackSummary?: string;
}

export interface IPbasSnapshotDocument {
    category1: IPbasCategory1Snapshot;
    category2: {
        researchPapers: IPbasResearchPaper[];
        books: IPbasBook[];
        patents: IPbasPatent[];
        conferences: IPbasConference[];
        projects: IPbasProject[];
    };
    category3: {
        committees: IPbasCommittee[];
        administrativeDuties: IPbasAdministrativeDuty[];
        examDuties: IPbasExamDuty[];
        studentGuidance: IPbasStudentGuidance[];
        extensionActivities: IPbasExtensionActivity[];
    };
}

export const PbasResearchPaperSchema = new Schema<IPbasResearchPaper>(
    {
        title: { type: String, required: true, trim: true },
        journal: { type: String, required: true, trim: true },
        year: { type: Number, required: true },
        issn: { type: String, trim: true },
        indexing: { type: String, trim: true },
    },
    { _id: false }
);

export const PbasBookSchema = new Schema<IPbasBook>(
    {
        title: { type: String, required: true, trim: true },
        publisher: { type: String, required: true, trim: true },
        isbn: { type: String, trim: true },
        year: { type: Number, required: true },
    },
    { _id: false }
);

export const PbasPatentSchema = new Schema<IPbasPatent>(
    {
        title: { type: String, required: true, trim: true },
        year: { type: Number, required: true },
        status: { type: String, required: true, trim: true },
    },
    { _id: false }
);

export const PbasConferenceSchema = new Schema<IPbasConference>(
    {
        title: { type: String, required: true, trim: true },
        organizer: { type: String, required: true, trim: true },
        year: { type: Number, required: true },
        type: { type: String, required: true, trim: true },
    },
    { _id: false }
);

export const PbasProjectSchema = new Schema<IPbasProject>(
    {
        title: { type: String, required: true, trim: true },
        fundingAgency: { type: String, required: true, trim: true },
        amount: { type: Number, default: 0 },
        year: { type: Number, required: true },
    },
    { _id: false }
);

export const PbasCommitteeSchema = new Schema<IPbasCommittee>(
    {
        committeeName: { type: String, required: true, trim: true },
        role: { type: String, trim: true },
        year: { type: Number },
    },
    { _id: false }
);

export const PbasAdministrativeDutySchema = new Schema<IPbasAdministrativeDuty>(
    {
        title: { type: String, required: true, trim: true },
        year: { type: Number },
    },
    { _id: false }
);

export const PbasExamDutySchema = new Schema<IPbasExamDuty>(
    {
        duty: { type: String, required: true, trim: true },
        year: { type: Number },
    },
    { _id: false }
);

export const PbasStudentGuidanceSchema = new Schema<IPbasStudentGuidance>(
    {
        activity: { type: String, required: true, trim: true },
        count: { type: Number, default: 0 },
    },
    { _id: false }
);

export const PbasExtensionActivitySchema = new Schema<IPbasExtensionActivity>(
    {
        title: { type: String, required: true, trim: true },
        role: { type: String, trim: true },
        year: { type: Number },
    },
    { _id: false }
);

export const PbasApiScoreSchema = new Schema<IPbasApiScore>(
    {
        teachingActivities: { type: Number, default: 0 },
        researchAcademicContribution: { type: Number, default: 0 },
        institutionalResponsibilities: { type: Number, default: 0 },
        totalScore: { type: Number, default: 0 },
    },
    { _id: false }
);

export const PbasCategory1SnapshotSchema = new Schema<IPbasCategory1Snapshot>(
    {
        classesTaken: { type: Number, default: 0 },
        coursePreparationHours: { type: Number, default: 0 },
        coursesTaught: { type: [String], default: [] },
        mentoringCount: { type: Number, default: 0 },
        labSupervisionCount: { type: Number, default: 0 },
        feedbackSummary: { type: String, trim: true },
    },
    { _id: false }
);

export const PbasSnapshotDocumentSchema = new Schema<IPbasSnapshotDocument>(
    {
        category1: { type: PbasCategory1SnapshotSchema, required: true },
        category2: {
            researchPapers: { type: [PbasResearchPaperSchema], default: [] },
            books: { type: [PbasBookSchema], default: [] },
            patents: { type: [PbasPatentSchema], default: [] },
            conferences: { type: [PbasConferenceSchema], default: [] },
            projects: { type: [PbasProjectSchema], default: [] },
        },
        category3: {
            committees: { type: [PbasCommitteeSchema], default: [] },
            administrativeDuties: { type: [PbasAdministrativeDutySchema], default: [] },
            examDuties: { type: [PbasExamDutySchema], default: [] },
            studentGuidance: { type: [PbasStudentGuidanceSchema], default: [] },
            extensionActivities: { type: [PbasExtensionActivitySchema], default: [] },
        },
    },
    { _id: false }
);
