import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFacultyEvidencePublication {
    title: string;
    journal: string;
    year: number;
    issn?: string;
    indexing?: string;
}

export interface IFacultyEvidenceBook {
    title: string;
    publisher: string;
    isbn?: string;
    year: number;
}

export interface IFacultyEvidenceProject {
    title: string;
    fundingAgency: string;
    amount?: number;
    year: number;
}

export interface IFacultyEvidencePatent {
    title: string;
    year: number;
    status: string;
}

export interface IFacultyEvidenceConference {
    title: string;
    organizer?: string;
    year: number;
    type?: string;
}

export interface IFacultyEvidenceWorkshop {
    title: string;
    role?: string;
    level?: string;
    year: number;
}

export interface IFacultyEvidenceExtensionActivity {
    title: string;
    roleOrAudience?: string;
    year: number;
}

export interface IFacultyEvidenceCollaboration {
    organization: string;
    purpose: string;
    year: number;
}

export interface IFacultyEvidence extends Document {
    facultyId: Types.ObjectId;
    publications: IFacultyEvidencePublication[];
    books: IFacultyEvidenceBook[];
    projects: IFacultyEvidenceProject[];
    patents: IFacultyEvidencePatent[];
    conferences: IFacultyEvidenceConference[];
    workshops: IFacultyEvidenceWorkshop[];
    extensionActivities: IFacultyEvidenceExtensionActivity[];
    collaborations: IFacultyEvidenceCollaboration[];
    createdAt: Date;
    updatedAt: Date;
}

const PublicationSchema = new Schema<IFacultyEvidencePublication>(
    {
        title: { type: String, required: true, trim: true },
        journal: { type: String, required: true, trim: true },
        year: { type: Number, required: true },
        issn: { type: String, trim: true },
        indexing: { type: String, trim: true },
    },
    { _id: false }
);

const BookSchema = new Schema<IFacultyEvidenceBook>(
    {
        title: { type: String, required: true, trim: true },
        publisher: { type: String, required: true, trim: true },
        isbn: { type: String, trim: true },
        year: { type: Number, required: true },
    },
    { _id: false }
);

const ProjectSchema = new Schema<IFacultyEvidenceProject>(
    {
        title: { type: String, required: true, trim: true },
        fundingAgency: { type: String, required: true, trim: true },
        amount: { type: Number, default: 0 },
        year: { type: Number, required: true },
    },
    { _id: false }
);

const PatentSchema = new Schema<IFacultyEvidencePatent>(
    {
        title: { type: String, required: true, trim: true },
        year: { type: Number, required: true },
        status: { type: String, required: true, trim: true },
    },
    { _id: false }
);

const ConferenceSchema = new Schema<IFacultyEvidenceConference>(
    {
        title: { type: String, required: true, trim: true },
        organizer: { type: String, trim: true },
        year: { type: Number, required: true },
        type: { type: String, trim: true },
    },
    { _id: false }
);

const WorkshopSchema = new Schema<IFacultyEvidenceWorkshop>(
    {
        title: { type: String, required: true, trim: true },
        role: { type: String, trim: true },
        level: { type: String, trim: true },
        year: { type: Number, required: true },
    },
    { _id: false }
);

const ExtensionActivitySchema = new Schema<IFacultyEvidenceExtensionActivity>(
    {
        title: { type: String, required: true, trim: true },
        roleOrAudience: { type: String, trim: true },
        year: { type: Number, required: true },
    },
    { _id: false }
);

const CollaborationSchema = new Schema<IFacultyEvidenceCollaboration>(
    {
        organization: { type: String, required: true, trim: true },
        purpose: { type: String, required: true, trim: true },
        year: { type: Number, required: true },
    },
    { _id: false }
);

const FacultyEvidenceSchema = new Schema<IFacultyEvidence>(
    {
        facultyId: { type: Schema.Types.ObjectId, ref: "User", unique: true, required: true, index: true },
        publications: { type: [PublicationSchema], default: [] },
        books: { type: [BookSchema], default: [] },
        projects: { type: [ProjectSchema], default: [] },
        patents: { type: [PatentSchema], default: [] },
        conferences: { type: [ConferenceSchema], default: [] },
        workshops: { type: [WorkshopSchema], default: [] },
        extensionActivities: { type: [ExtensionActivitySchema], default: [] },
        collaborations: { type: [CollaborationSchema], default: [] },
    },
    {
        timestamps: true,
        collection: "faculty_evidence",
    }
);

const FacultyEvidence: Model<IFacultyEvidence> =
    mongoose.models.FacultyEvidence ||
    mongoose.model<IFacultyEvidence>("FacultyEvidence", FacultyEvidenceSchema);

export default FacultyEvidence;
