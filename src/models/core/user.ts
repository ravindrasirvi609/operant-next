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
    profileStatus?: "Draft" | "PendingApproval" | "Approved" | "Rejected";
    profileSubmittedAt?: Date;
    approvedAt?: Date;
    approvedById?: mongoose.Types.ObjectId;
    approvedByName?: string;
    approvalNotes?: string;
    assignedHodId?: mongoose.Types.ObjectId;
    assignedHodName?: string;
    assignedHodEmail?: string;
    rejectionReason?: string;
    personalInfo?: {
        dateOfBirth?: string;
        gender?: string;
        bloodGroup?: string;
        address?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        emergencyContactName?: string;
        emergencyContactPhone?: string;
        parentName?: string;
        parentPhone?: string;
    };
    academicInfo?: {
        currentSemester?: string;
        cgpa?: string;
        section?: string;
        mentorName?: string;
        areasOfInterest?: string[];
    };
    careerProfile?: {
        headline?: string;
        summary?: string;
        careerObjective?: string;
        skills?: string[];
        languages?: string[];
        certifications?: string[];
        achievements?: string[];
        projects?: {
            title: string;
            description?: string;
            techStack?: string[];
            link?: string;
        }[];
        internships?: {
            organization: string;
            role?: string;
            duration?: string;
            description?: string;
        }[];
        socialLinks?: {
            linkedin?: string;
            github?: string;
            portfolio?: string;
        };
    };
}

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    photoURL?: string;
    role: UserRole;
    accountStatus: "PendingActivation" | "Active" | "Suspended";
    institutionId?: mongoose.Types.ObjectId;
    departmentId?: mongoose.Types.ObjectId;
    studentId?: mongoose.Types.ObjectId;
    facultyId?: mongoose.Types.ObjectId;
    universityName?: string;
    department?: string;
    collegeName?: string;
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
        password: { type: String, select: false },
        photoURL: { type: String },
        role: {
            type: String,
            required: true,
            enum: ['Faculty', 'Student', 'Alumni', 'Admin', 'Director', 'PRO', 'NSS', 'Sports', 'Swayam', 'Placement'],
            index: true
        },
        accountStatus: {
            type: String,
            required: true,
            enum: ["PendingActivation", "Active", "Suspended"],
            default: "Active",
            index: true,
        },
        institutionId: { type: Schema.Types.ObjectId, ref: "Institution", index: true },
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
        studentId: { type: Schema.Types.ObjectId, ref: "Student" },
        facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
        universityName: { type: String, trim: true, index: true },
        department: { type: String, trim: true },
        collegeName: { type: String, trim: true, index: true },
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
            profileStatus: {
                type: String,
                enum: ["Draft", "PendingApproval", "Approved", "Rejected"],
                default: "Draft",
            },
            profileSubmittedAt: { type: Date },
            approvedAt: { type: Date },
            approvedById: { type: Schema.Types.ObjectId, ref: "User" },
            approvedByName: { type: String },
            approvalNotes: { type: String },
            assignedHodId: { type: Schema.Types.ObjectId, ref: "User" },
            assignedHodName: { type: String },
            assignedHodEmail: { type: String, lowercase: true, trim: true },
            rejectionReason: { type: String },
            personalInfo: {
                dateOfBirth: { type: String },
                gender: { type: String },
                bloodGroup: { type: String },
                address: { type: String },
                city: { type: String },
                state: { type: String },
                postalCode: { type: String },
                emergencyContactName: { type: String },
                emergencyContactPhone: { type: String },
                parentName: { type: String },
                parentPhone: { type: String },
            },
            academicInfo: {
                currentSemester: { type: String },
                cgpa: { type: String },
                section: { type: String },
                mentorName: { type: String },
                areasOfInterest: { type: [String], default: [] },
            },
            careerProfile: {
                headline: { type: String },
                summary: { type: String },
                careerObjective: { type: String },
                skills: { type: [String], default: [] },
                languages: { type: [String], default: [] },
                certifications: { type: [String], default: [] },
                achievements: { type: [String], default: [] },
                projects: [
                    {
                        title: { type: String, required: true },
                        description: { type: String },
                        techStack: { type: [String], default: [] },
                        link: { type: String },
                    },
                ],
                internships: [
                    {
                        organization: { type: String, required: true },
                        role: { type: String },
                        duration: { type: String },
                        description: { type: String },
                    },
                ],
                socialLinks: {
                    linkedin: { type: String },
                    github: { type: String },
                    portfolio: { type: String },
                },
            },
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

UserSchema.index({ institutionId: 1, role: 1 });
UserSchema.index({ departmentId: 1, role: 1 });
UserSchema.index({ studentId: 1 }, { unique: true, sparse: true });
UserSchema.index({ facultyId: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1, accountStatus: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
