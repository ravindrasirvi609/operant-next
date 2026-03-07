import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFacultyDegree {
    level: string;
    degree: string;
    subject?: string;
    institution?: string;
    year?: string;
}

export interface ICasEntry {
    _id?: Types.ObjectId;
    assessmentPeriodStart: string;
    assessmentPeriodEnd: string;
    promotionFrom: string;
    promotionTo: string;
    currentStage?: string;
    teachingExperienceYears?: number;
    researchSummary?: string;
    publicationCount?: number;
    bookCount?: number;
    conferenceCount?: number;
    workshopCount?: number;
    projectCount?: number;
    phdSupervisionCount?: number;
    adminResponsibilitySummary?: string;
    apiScoreClaimed?: number;
    status?: "Draft" | "Submitted";
    submittedAt?: Date;
}

export interface IPbasEntry {
    _id?: Types.ObjectId;
    academicYear: string;
    teachingHours?: number;
    coursesHandled?: string[];
    mentoringCount?: number;
    labSupervisionCount?: number;
    researchPaperCount?: number;
    journalCount?: number;
    bookCount?: number;
    patentCount?: number;
    conferenceCount?: number;
    committeeWork?: string;
    examDuties?: string;
    studentGuidance?: string;
    teachingScore?: number;
    researchScore?: number;
    institutionalScore?: number;
    totalApiScore?: number;
    remarks?: string;
    submittedAt?: Date;
}

export interface IAqarEntry {
    _id?: Types.ObjectId;
    academicYear: string;
    teachingInnovations?: string;
    facultyDevelopmentActivities?: string;
    publications?: string;
    conferences?: string;
    workshopsConducted?: string;
    extensionActivities?: string;
    studentResults?: string;
    infrastructureSupport?: string;
    innovationPractices?: string;
    institutionalContribution?: string;
    submittedAt?: Date;
}

export interface IFacultyRecord extends Document {
    userId: Types.ObjectId;
    employeeId?: string;
    joiningDate?: string;
    biography?: string;
    specialization?: string;
    researchInterests: string[];
    professionalMemberships: string[];
    certifications: string[];
    awards: string[];
    coursesTaught: string[];
    administrativeResponsibilities: string[];
    degrees: IFacultyDegree[];
    casEntries: ICasEntry[];
    pbasEntries: IPbasEntry[];
    aqarEntries: IAqarEntry[];
    createdAt: Date;
    updatedAt: Date;
}

const DegreeSchema = new Schema<IFacultyDegree>(
    {
        level: { type: String, required: true, trim: true },
        degree: { type: String, required: true, trim: true },
        subject: { type: String, trim: true },
        institution: { type: String, trim: true },
        year: { type: String, trim: true },
    },
    { _id: false }
);

const CasEntrySchema = new Schema<ICasEntry>(
    {
        assessmentPeriodStart: { type: String, required: true, trim: true },
        assessmentPeriodEnd: { type: String, required: true, trim: true },
        promotionFrom: { type: String, required: true, trim: true },
        promotionTo: { type: String, required: true, trim: true },
        currentStage: { type: String, trim: true },
        teachingExperienceYears: { type: Number, default: 0 },
        researchSummary: { type: String, trim: true },
        publicationCount: { type: Number, default: 0 },
        bookCount: { type: Number, default: 0 },
        conferenceCount: { type: Number, default: 0 },
        workshopCount: { type: Number, default: 0 },
        projectCount: { type: Number, default: 0 },
        phdSupervisionCount: { type: Number, default: 0 },
        adminResponsibilitySummary: { type: String, trim: true },
        apiScoreClaimed: { type: Number, default: 0 },
        status: { type: String, enum: ["Draft", "Submitted"], default: "Submitted" },
        submittedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const PbasEntrySchema = new Schema<IPbasEntry>(
    {
        academicYear: { type: String, required: true, trim: true },
        teachingHours: { type: Number, default: 0 },
        coursesHandled: { type: [String], default: [] },
        mentoringCount: { type: Number, default: 0 },
        labSupervisionCount: { type: Number, default: 0 },
        researchPaperCount: { type: Number, default: 0 },
        journalCount: { type: Number, default: 0 },
        bookCount: { type: Number, default: 0 },
        patentCount: { type: Number, default: 0 },
        conferenceCount: { type: Number, default: 0 },
        committeeWork: { type: String, trim: true },
        examDuties: { type: String, trim: true },
        studentGuidance: { type: String, trim: true },
        teachingScore: { type: Number, default: 0 },
        researchScore: { type: Number, default: 0 },
        institutionalScore: { type: Number, default: 0 },
        totalApiScore: { type: Number, default: 0 },
        remarks: { type: String, trim: true },
        submittedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const AqarEntrySchema = new Schema<IAqarEntry>(
    {
        academicYear: { type: String, required: true, trim: true },
        teachingInnovations: { type: String, trim: true },
        facultyDevelopmentActivities: { type: String, trim: true },
        publications: { type: String, trim: true },
        conferences: { type: String, trim: true },
        workshopsConducted: { type: String, trim: true },
        extensionActivities: { type: String, trim: true },
        studentResults: { type: String, trim: true },
        infrastructureSupport: { type: String, trim: true },
        innovationPractices: { type: String, trim: true },
        institutionalContribution: { type: String, trim: true },
        submittedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const FacultyRecordSchema = new Schema<IFacultyRecord>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", unique: true, required: true, index: true },
        employeeId: { type: String, trim: true },
        joiningDate: { type: String, trim: true },
        biography: { type: String, trim: true },
        specialization: { type: String, trim: true },
        researchInterests: { type: [String], default: [] },
        professionalMemberships: { type: [String], default: [] },
        certifications: { type: [String], default: [] },
        awards: { type: [String], default: [] },
        coursesTaught: { type: [String], default: [] },
        administrativeResponsibilities: { type: [String], default: [] },
        degrees: { type: [DegreeSchema], default: [] },
        casEntries: { type: [CasEntrySchema], default: [] },
        pbasEntries: { type: [PbasEntrySchema], default: [] },
        aqarEntries: { type: [AqarEntrySchema], default: [] },
    },
    {
        timestamps: true,
        collection: "faculty_records",
    }
);

const FacultyRecord: Model<IFacultyRecord> =
    mongoose.models.FacultyRecord ||
    mongoose.model<IFacultyRecord>("FacultyRecord", FacultyRecordSchema);

export default FacultyRecord;
