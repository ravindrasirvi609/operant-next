import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type FacultyEmploymentType = "Permanent" | "AdHoc" | "Guest";
export type FacultyStatus = "Active" | "OnLeave" | "Retired" | "Inactive";
export type FacultyGender = "Male" | "Female" | "Other";

export interface IFacultyQualification {
    level: string;
    degree: string;
    subject?: string;
    institution?: string;
    year?: string;
}

export interface IFacultyResearchProfile {
    orcidId?: string;
    scopusId?: string;
    researcherId?: string;
    googleScholarId?: string;
}

export interface IFaculty extends Document {
    userId?: Types.ObjectId;
    employeeCode: string;
    firstName: string;
    lastName?: string;
    gender?: FacultyGender;
    dob?: Date;
    email?: string;
    mobile?: string;
    designation: string;
    joiningDate?: Date;
    employmentType: FacultyEmploymentType;
    departmentId: Types.ObjectId;
    institutionId: Types.ObjectId;
    biography?: string;
    researchInterests: string[];
    professionalMemberships: string[];
    certifications: string[];
    administrativeResponsibilities: string[];
    qualifications: IFacultyQualification[];
    researchProfile?: IFacultyResearchProfile;
    highestQualification?: string;
    specialization?: string;
    experienceYears?: number;
    status: FacultyStatus;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyQualificationSchema = new Schema<IFacultyQualification>(
    {
        level: { type: String, required: true, trim: true },
        degree: { type: String, required: true, trim: true },
        subject: { type: String, trim: true },
        institution: { type: String, trim: true },
        year: { type: String, trim: true },
    },
    { _id: false }
);

const FacultyResearchProfileSchema = new Schema<IFacultyResearchProfile>(
    {
        orcidId: { type: String, trim: true },
        scopusId: { type: String, trim: true },
        researcherId: { type: String, trim: true },
        googleScholarId: { type: String, trim: true },
    },
    { _id: false }
);

const FacultySchema = new Schema<IFaculty>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        employeeCode: { type: String, required: true, trim: true },
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, trim: true },
        gender: { type: String, enum: ["Male", "Female", "Other"] },
        dob: { type: Date },
        email: { type: String, trim: true, lowercase: true },
        mobile: { type: String, trim: true },
        designation: { type: String, required: true, trim: true, index: true },
        joiningDate: { type: Date },
        employmentType: {
            type: String,
            required: true,
            enum: ["Permanent", "AdHoc", "Guest"],
            default: "Permanent",
            index: true,
        },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
        biography: { type: String, trim: true },
        researchInterests: { type: [String], default: [] },
        professionalMemberships: { type: [String], default: [] },
        certifications: { type: [String], default: [] },
        administrativeResponsibilities: { type: [String], default: [] },
        qualifications: { type: [FacultyQualificationSchema], default: [] },
        researchProfile: FacultyResearchProfileSchema,
        highestQualification: { type: String, trim: true },
        specialization: { type: String, trim: true },
        experienceYears: { type: Number, min: 0, default: 0 },
        status: {
            type: String,
            required: true,
            enum: ["Active", "OnLeave", "Retired", "Inactive"],
            default: "Active",
            index: true,
        },
    },
    { timestamps: true, collection: "faculty" }
);

FacultySchema.index({ employeeCode: 1 }, { unique: true });
FacultySchema.index({ userId: 1 }, { unique: true, sparse: true });
FacultySchema.index({ email: 1 }, { unique: true, sparse: true });
FacultySchema.index({ institutionId: 1, departmentId: 1, status: 1 });

const Faculty: Model<IFaculty> =
    mongoose.models.Faculty ||
    mongoose.model<IFaculty>("Faculty", FacultySchema);

export default Faculty;
