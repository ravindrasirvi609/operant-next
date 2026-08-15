import mongoose, { Document, Model, Schema } from "mongoose";

// --- Subdocument Schemas ---

const ExperienceSchema = new Schema({
    designation: { type: String, required: true },
    organization: { type: String, required: true },
    fromDate: { type: String },
    toDate: { type: String },
    isCurrent: { type: Boolean, default: false },
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

export interface IExperience {
    designation: string;
    organization: string;
    fromDate?: string;
    toDate?: string;
    isCurrent?: boolean;
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
    alumniId?: mongoose.Types.ObjectId;
    universityName?: string;
    department?: string;
    collegeName?: string;
    designation?: string;
    phone?: string;
    experience: IExperience[];
    isActive: boolean;
    emailVerified: boolean;
    emailVerificationTokenHash?: string;
    emailVerificationExpiresAt?: Date;
    passwordResetTokenHash?: string;
    passwordResetExpiresAt?: Date;
    lastLoginAt?: Date;
    /**
     * Monotonic session generation counter. Embedded in the session JWT at
     * issuance and compared on every authenticated request; bumping it (e.g. on
     * password reset) invalidates all previously-issued tokens. See
     * `src/lib/auth/session.ts` and `getCurrentUser()`.
     */
    sessionVersion: number;
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
        alumniId: { type: Schema.Types.ObjectId, ref: "Alumni" },
        universityName: { type: String, trim: true, index: true },
        department: { type: String, trim: true },
        collegeName: { type: String, trim: true, index: true },
        designation: { type: String, trim: true },
        phone: { type: String, trim: true },

        // Embedded Faculty Data
        experience: [ExperienceSchema],
        isActive: { type: Boolean, default: true },
        emailVerified: { type: Boolean, default: false },
        emailVerificationTokenHash: { type: String, select: false },
        emailVerificationExpiresAt: { type: Date, select: false },
        passwordResetTokenHash: { type: String, select: false },
        passwordResetExpiresAt: { type: Date, select: false },
        lastLoginAt: { type: Date },
        // Session generation counter for JWT revocation (default 0 keeps every
        // pre-existing token valid until the counter is first bumped).
        sessionVersion: { type: Number, default: 0 },
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
UserSchema.index({ alumniId: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1, accountStatus: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
