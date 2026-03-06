import mongoose, { Schema, Document, Model, Types } from "mongoose";

// --- JRF/SRF Models ---

export interface IJrfSrf extends Document {
    researchName: string;
    enrolmentYear?: string;
    fellowshipDate: string;
    fellowshipDuration: string;
    fellowshipType: string;
    grantingAgency: string;
    qualifyingExam: string;
    year: string;
    proof?: string;
    schoolName?: string;
    guideName?: string;
    studentId?: string;
    otherUser?: string;
    userId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const JrfSrfSchema = new Schema<IJrfSrf>(
    {
        researchName: { type: String, required: true, trim: true },
        enrolmentYear: { type: String, trim: true },
        fellowshipDate: { type: String, required: true, trim: true },
        fellowshipDuration: { type: String, required: true, trim: true },
        fellowshipType: { type: String, required: true, trim: true },
        grantingAgency: { type: String, required: true, trim: true },
        qualifyingExam: { type: String, required: true, trim: true },
        year: { type: String, required: true, index: true },
        proof: { type: String, trim: true },
        schoolName: { type: String, trim: true, index: true },
        guideName: { type: String, trim: true, index: true },
        studentId: { type: String, trim: true },
        otherUser: { type: String, trim: true },
        userId: { type: Schema.Types.ObjectId, ref: "FacultyUser", index: true },
    },
    { timestamps: true }
);

export const AdminJrfSrf =
    mongoose.models.AdminJrfSrf ||
    mongoose.model<IJrfSrf>("AdminJrfSrf", JrfSrfSchema, "jrfsrfadmins");

export const FacultyJrfSrf =
    mongoose.models.FacultyJrfSrf ||
    mongoose.model<IJrfSrf>("FacultyJrfSrf", JrfSrfSchema, "jrfsrfs");

// --- PhD Awarded Models ---

export interface IPhdAwarded extends Document {
    scholarName: string;
    schoolName?: string;
    departmentName?: string;
    guideName: string;
    degreeName: string;
    awardSubmit: string;
    thesisTitle: string;
    yearOfScholar?: string;
    rac?: string;
    gender: string;
    category: string;
    phdAwardYear?: string;
    year: string;
    proof?: string;
    otherUser?: string;
    userId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PhdAwardedSchema = new Schema<IPhdAwarded>(
    {
        scholarName: { type: String, required: true, trim: true },
        schoolName: { type: String, trim: true, index: true },
        departmentName: { type: String, trim: true },
        guideName: { type: String, required: true, trim: true, index: true },
        degreeName: { type: String, required: true, trim: true },
        awardSubmit: { type: String, required: true, trim: true },
        thesisTitle: { type: String, required: true, trim: true },
        yearOfScholar: { type: String, trim: true },
        rac: { type: String, trim: true },
        gender: { type: String, required: true },
        category: { type: String, required: true, trim: true },
        phdAwardYear: { type: String, trim: true },
        year: { type: String, required: true, index: true },
        proof: { type: String, trim: true },
        otherUser: { type: String, trim: true },
        userId: { type: Schema.Types.ObjectId, ref: "FacultyUser", index: true },
    },
    { timestamps: true }
);

export const AdminPhdAwarded =
    mongoose.models.AdminPhdAwarded ||
    mongoose.model<IPhdAwarded>(
        "AdminPhdAwarded",
        PhdAwardedSchema,
        "phdawardedadmins"
    );

export const FacultyPhdAwarded =
    mongoose.models.FacultyPhdAwarded ||
    mongoose.model<IPhdAwarded>("FacultyPhdAwarded", PhdAwardedSchema, "phdawardeds");

// --- Research Project Models ---

export interface IResearchProject extends Document {
    schemeName: string;
    programTitle?: string;
    principalName: string;
    coInvestigator?: string;
    isCo?: boolean;
    durationYears: string[];
    active?: boolean;
    fundingName: string;
    isGov: string;
    department?: string;
    awardYear: string;
    providedFunds: string;
    fundType: string;
    status: string;
    duration?: string;
    year: string;
    proof?: string;
    schoolName?: string;
    guideName?: string;
    studentId?: string;
    userId?: Types.ObjectId;
    otherUser?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ResearchProjectSchema = new Schema<IResearchProject>(
    {
        schemeName: { type: String, required: true, trim: true },
        programTitle: { type: String, trim: true },
        principalName: { type: String, required: true, trim: true, index: true },
        coInvestigator: { type: String, trim: true, default: "-" },
        isCo: { type: Boolean, default: false },
        durationYears: { type: [String], default: [] },
        active: { type: Boolean, default: true },
        fundingName: { type: String, required: true, trim: true },
        isGov: { type: String, required: true, trim: true },
        department: { type: String, trim: true },
        awardYear: { type: String, required: true, trim: true },
        providedFunds: { type: String, required: true, trim: true },
        fundType: { type: String, required: true, trim: true },
        status: { type: String, required: true, trim: true },
        duration: { type: String, trim: true },
        year: { type: String, required: true, index: true },
        proof: { type: String, trim: true },
        schoolName: { type: String, trim: true, index: true },
        guideName: { type: String, trim: true, index: true },
        studentId: { type: String, trim: true },
        userId: { type: Schema.Types.ObjectId, ref: "FacultyUser", index: true },
        otherUser: { type: String, trim: true },
    },
    { timestamps: true }
);

export const AdminResearchProject =
    mongoose.models.AdminResearchProject ||
    mongoose.model<IResearchProject>(
        "AdminResearchProject",
        ResearchProjectSchema,
        "researchprojectadmins"
    );

export const FacultyResearchProject =
    mongoose.models.FacultyResearchProject ||
    mongoose.model<IResearchProject>(
        "FacultyResearchProject",
        ResearchProjectSchema,
        "researchprojects"
    );
