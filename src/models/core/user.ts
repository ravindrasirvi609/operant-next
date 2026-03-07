import mongoose, { Document, Model, Schema } from "mongoose";

// --- Subdocument Schemas ---

const QualificationSchema = new Schema({
    degree: { type: String, required: true },
    subject: { type: String },
    university: { type: String },
    year: { type: String },
    percentage: { type: String },
}, { _id: false });

const ExperienceSchema = new Schema({
    designation: { type: String, required: true },
    organization: { type: String, required: true },
    fromDate: { type: String },
    toDate: { type: String },
    isCurrent: { type: Boolean, default: false },
}, { _id: false });

const ResearchProfileSchema = new Schema({
    orcidId: { type: String },
    scopusId: { type: String },
    researcherId: { type: String },
    googleScholarId: { type: String },
}, { _id: false });

// --- Unified User Schema ---

export type UserRole =
    | "Faculty"
    | "Student"
    | "Alumni"
    | "Admin"
    | "Director"
    | "PRO"
    | "NSS"
    | "Sports"
    | "Swayam"
    | "Placement";

export interface IQualification {
    degree: string;
    subject?: string;
    university?: string;
    year?: string;
    percentage?: string;
}

export interface IExperience {
    designation: string;
    organization: string;
    fromDate?: string;
    toDate?: string;
    isCurrent?: boolean;
}

export interface IResearchProfile {
    orcidId?: string;
    scopusId?: string;
    researcherId?: string;
    googleScholarId?: string;
}

export interface IStudentDetails {
    rollNo: string;
    course: string;
    batch: string;
    admissionYear: string;
}

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    photoURL?: string;
    role: UserRole;
    collegeName?: string;
    department?: string;
    schoolName?: string;
    designation?: string;
    phone?: string;
    qualifications: IQualification[];
    experience: IExperience[];
    researchProfile?: IResearchProfile;
    studentDetails?: IStudentDetails;
    isActive: boolean;
    emailVerified: boolean;
    emailVerificationTokenHash?: string;
    emailVerificationExpiresAt?: Date;
    passwordResetTokenHash?: string;
    passwordResetExpiresAt?: Date;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        password: { type: String, required: true, select: false },
        photoURL: { type: String },
        role: {
            type: String,
            required: true,
            enum: ['Faculty', 'Student', 'Alumni', 'Admin', 'Director', 'PRO', 'NSS', 'Sports', 'Swayam', 'Placement'],
            index: true
        },
        collegeName: { type: String, trim: true, index: true },
        department: { type: String, trim: true },
        schoolName: { type: String, trim: true, index: true },
        designation: { type: String, trim: true },
        phone: { type: String, trim: true },

        // Embedded Faculty Data
        qualifications: [QualificationSchema],
        experience: [ExperienceSchema],
        researchProfile: ResearchProfileSchema,

        // Embedded Student Data
        studentDetails: {
            rollNo: { type: String },
            course: { type: String },
            batch: { type: String },
            admissionYear: { type: String },
        },

        isActive: { type: Boolean, default: true },
        emailVerified: { type: Boolean, default: false },
        emailVerificationTokenHash: { type: String, select: false },
        emailVerificationExpiresAt: { type: Date, select: false },
        passwordResetTokenHash: { type: String, select: false },
        passwordResetExpiresAt: { type: Date, select: false },
        lastLoginAt: { type: Date },
    },
    {
        timestamps: true,
        collection: 'users' // Consolidated collection
    }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
