import { redirect } from "next/navigation";

import dbConnect from "@/lib/dbConnect";
import { clearSessionCookie, createSessionToken, getSessionPayload, setSessionCookie } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/errors";
import { authConfig } from "@/lib/auth/config";
import { resolveAuthorizationProfile } from "@/lib/authorization/service";
import { hasGovernancePortalAccess } from "@/lib/governance/service";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/auth/email";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { addHours, addMinutes, createRandomToken, hashToken } from "@/lib/auth/tokens";
import {
    adminBootstrapSchema,
    adminLoginSchema,
    facultyActivationSchema,
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resendVerificationSchema,
    resetPasswordSchema,
    studentActivationSchema,
} from "@/lib/auth/validators";
import Organization from "@/models/core/organization";
import Faculty from "@/models/faculty/faculty";
import Student from "@/models/student/student";
import User, { IUser } from "@/models/core/user";

type SafeUser = {
    id: string;
    name: string;
    email: string;
    role: string;
    accountStatus: IUser["accountStatus"];
    universityName?: string;
    department?: string;
    collegeName?: string;
    designation?: string;
    phone?: string;
    facultyId?: string;
    emailVerified: boolean;
    lastLoginAt?: Date;
};

function getPostLoginPath(user: SafeUser) {
    if (user.role === "Student") {
        if (user.accountStatus === "PendingActivation") {
            return "/activate-student";
        }

        return "/student/records";
    }

    if (user.role === "Faculty") {
        if (user.accountStatus === "PendingActivation") {
            return "/activate-faculty";
        }

        return "/faculty";
    }

    return "/";
}

function toSafeUser(user: IUser): SafeUser {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        universityName: user.universityName,
        department: user.department,
        collegeName: user.collegeName,
        designation: user.designation,
        phone: user.phone,
        facultyId: user.facultyId?.toString(),
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
    };
}

async function issueVerificationToken(user: IUser) {
    const rawToken = createRandomToken();
    user.emailVerificationTokenHash = hashToken(rawToken);
    user.emailVerificationExpiresAt = addHours(authConfig.verificationTokenDurationHours);
    await user.save();

    await sendVerificationEmail({
        email: user.email,
        name: user.name,
        token: rawToken,
    });
}

type LoginOptions = {
    requiredRole?: string;
    roleMismatchMessage?: string;
};

function normalizePhone(value?: string | null) {
    return String(value ?? "").replace(/\D+/g, "");
}

async function findUserForLogin(identifier: string) {
    const normalized = identifier.trim();
    const emailCandidate = normalized.toLowerCase();

    const user =
        (await User.findOne({ email: emailCandidate }).select("+password")) ||
        null;

    if (user) {
        return user;
    }

    const student = await Student.findOne({ enrollmentNo: normalized }).select("userId");

    if (!student?.userId) {
        return null;
    }

    return User.findById(student.userId).select("+password");
}

export async function registerUser(rawInput: unknown) {
    const input = registerSchema.parse(rawInput);

    await dbConnect();

    const email = input.email.toLowerCase();
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new AuthError("An account with this email already exists.", 409);
    }

    const password = await hashPassword(input.password);

    const user = await User.create({
        name: input.name,
        email,
        password,
        role: input.role,
        phone: input.phone,
        universityName: input.universityName,
        department: input.department,
        collegeName: input.collegeName,
        designation: input.role === "Faculty" ? input.designation : undefined,
        accountStatus: "Active",
        experience: [],
        emailVerified: false,
    });

    await issueVerificationToken(user);

    return {
        message: "Registration successful. Check your email to verify your account.",
    };
}

export async function loginUser(rawInput: unknown, options?: LoginOptions) {
    const input = loginSchema.parse(rawInput);

    await dbConnect();

    const user = await findUserForLogin(input.email);

    if (!user) {
        throw new AuthError("Invalid credentials.", 401);
    }

    if (user.role === "Student" && (!user.password || user.accountStatus === "PendingActivation")) {
        throw new AuthError(
            "Your institutional account is ready. Complete First Time Student Login Setup before signing in.",
            403
        );
    }

    if (user.role === "Faculty" && (!user.password || user.accountStatus === "PendingActivation")) {
        throw new AuthError(
            "Your institutional faculty account is ready. Complete First Time Faculty Login Setup before signing in.",
            403
        );
    }

    if (!user.password) {
        throw new AuthError("Invalid credentials.", 401);
    }

    const isValidPassword = await verifyPassword(input.password, user.password);

    if (!isValidPassword) {
        throw new AuthError("Invalid credentials.", 401);
    }

    if (!user.isActive || user.accountStatus === "Suspended") {
        throw new AuthError("This UMIS account has been deactivated.", 403);
    }

    if (!user.emailVerified) {
        throw new AuthError("Verify your email before signing in.", 403);
    }

    if (options?.requiredRole && user.role !== options.requiredRole) {
        throw new AuthError(
            options.roleMismatchMessage ??
                `Only ${options.requiredRole} users can access this portal.`,
            403
        );
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = await createSessionToken({
        sub: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
    });

    await setSessionCookie(token);

    const safeUser = toSafeUser(user);

    return {
        message: "Login successful.",
        redirectPath: getPostLoginPath(safeUser),
        user: safeUser,
    };
}

export async function loginAdmin(rawInput: unknown) {
    adminLoginSchema.parse(rawInput);

    return loginUser(rawInput, {
        requiredRole: "Admin",
        roleMismatchMessage: "Only admin users can access the admin portal.",
    });
}

export async function loginDirector(rawInput: unknown) {
    const result = await loginUser(rawInput);

    await dbConnect();

    const hasLeadershipAccess = (await resolveAuthorizationProfile(result.user)).hasLeadershipPortalAccess;

    if (!hasLeadershipAccess) {
        await clearSessionCookie();
        throw new AuthError(
            "Only users with active governance assignments or committee memberships can access the leadership portal.",
            403
        );
    }

    return result;
}

export async function logoutUser() {
    await clearSessionCookie();

    return {
        message: "You have been signed out.",
    };
}

export async function requestPasswordReset(rawInput: unknown) {
    const input = forgotPasswordSchema.parse(rawInput);

    await dbConnect();

    const user = await User.findOne({ email: input.email.toLowerCase() });

    if (user && user.emailVerified && user.isActive && user.accountStatus === "Active") {
        const rawToken = createRandomToken();
        user.passwordResetTokenHash = hashToken(rawToken);
        user.passwordResetExpiresAt = addMinutes(authConfig.passwordResetDurationMinutes);
        await user.save();

        await sendPasswordResetEmail({
            email: user.email,
            name: user.name,
            token: rawToken,
        });
    }

    return {
        message:
            "If an account exists for that email, a password reset link has been sent.",
    };
}

export async function resetPassword(rawInput: unknown) {
    const input = resetPasswordSchema.parse(rawInput);

    await dbConnect();

    const user = await User.findOne({
        passwordResetTokenHash: hashToken(input.token),
        passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpiresAt");

    if (!user) {
        throw new AuthError("This password reset link is invalid or has expired.", 400);
    }

    user.password = await hashPassword(input.password);
    user.accountStatus = "Active";
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    const token = await createSessionToken({
        sub: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
    });

    await setSessionCookie(token);

    return {
        message: "Password updated successfully.",
        user: toSafeUser(user),
    };
}

export async function resendVerificationEmail(rawInput: unknown) {
    const input = resendVerificationSchema.parse(rawInput);

    await dbConnect();

    const user = await User.findOne({ email: input.email.toLowerCase() });

    if (user && !user.emailVerified && user.isActive && user.accountStatus !== "PendingActivation") {
        await issueVerificationToken(user);
    }

    return {
        message:
            "If your account is waiting for verification, a fresh email has been sent.",
    };
}

export async function verifyEmailToken(token: string) {
    await dbConnect();

    const user = await User.findOne({
        emailVerificationTokenHash: hashToken(token),
        emailVerificationExpiresAt: { $gt: new Date() },
    }).select("+emailVerificationTokenHash +emailVerificationExpiresAt");

    if (!user) {
        return {
            success: false,
            message: "This verification link is invalid or has expired.",
        };
    }

    user.emailVerified = true;
    if (user.accountStatus !== "Suspended") {
        user.accountStatus = "Active";
    }
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    return {
        success: true,
        message: "Email verified. You can now sign in to UMIS.",
    };
}

export async function activateStudentAccount(rawInput: unknown) {
    const input = studentActivationSchema.parse(rawInput);

    await dbConnect();

    const student = await Student.findOne({
        enrollmentNo: input.enrollmentNo.trim(),
    }).select("userId email mobile");

    if (!student?.userId) {
        throw new AuthError(
            "No pre-provisioned student account was found for that enrollment number.",
            404
        );
    }

    const user = await User.findById(student.userId).select("+password");

    if (!user || user.role !== "Student") {
        throw new AuthError("Student activation record is invalid.", 400);
    }

    const verificationValue = input.verificationValue.trim();
    const isEmailVerification = verificationValue.includes("@");

    const verified = isEmailVerification
        ? [user.email, student.email].some(
              (value) =>
                  value?.trim().toLowerCase() === verificationValue.toLowerCase()
          )
        : [user.phone, student.mobile].some(
              (value) => normalizePhone(value) === normalizePhone(verificationValue)
          );

    if (!verified) {
        throw new AuthError(
            "The enrollment number and registered contact details do not match our records.",
            403
        );
    }

    if (user.password && user.accountStatus === "Active") {
        throw new AuthError(
            "This student account is already activated. Sign in normally instead.",
            409
        );
    }

    user.password = await hashPassword(input.password);
    user.accountStatus = "Active";
    user.emailVerified = true;
    user.isActive = true;
    user.studentId = student._id;
    user.lastLoginAt = new Date();
    await user.save();

    const token = await createSessionToken({
        sub: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
    });

    await setSessionCookie(token);

    const safeUser = toSafeUser(user);

    return {
        message: "Student account activated successfully.",
        redirectPath: getPostLoginPath(safeUser),
        user: safeUser,
    };
}

export async function activateFacultyAccount(rawInput: unknown) {
    const input = facultyActivationSchema.parse(rawInput);

    await dbConnect();

    const faculty = await Faculty.findOne({
        employeeCode: input.employeeCode.trim(),
    }).select("userId email");

    if (!faculty?.userId) {
        throw new AuthError(
            "No pre-provisioned faculty account was found for that employee code.",
            404
        );
    }

    const user = await User.findById(faculty.userId).select("+password");

    if (!user || user.role !== "Faculty") {
        throw new AuthError("Faculty activation record is invalid.", 400);
    }

    if (user.email.trim().toLowerCase() !== input.email.trim().toLowerCase()) {
        throw new AuthError(
            "The employee code and registered institutional email do not match our records.",
            403
        );
    }

    if (user.password && user.accountStatus === "Active") {
        throw new AuthError(
            "This faculty account is already activated. Sign in normally instead.",
            409
        );
    }

    user.password = await hashPassword(input.password);
    user.accountStatus = "Active";
    user.emailVerified = true;
    user.isActive = true;
    user.facultyId = faculty._id;
    user.lastLoginAt = new Date();
    await user.save();

    const token = await createSessionToken({
        sub: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
    });

    await setSessionCookie(token);

    const safeUser = toSafeUser(user);

    return {
        message: "Faculty account activated successfully.",
        redirectPath: getPostLoginPath(safeUser),
        user: safeUser,
    };
}

export async function getAdminCount() {
    await dbConnect();
    return User.countDocuments({ role: "Admin" });
}

export async function bootstrapAdmin(rawInput: unknown) {
    const input = adminBootstrapSchema.parse(rawInput);

    await dbConnect();

    const existingAdminCount = await User.countDocuments({ role: "Admin" });

    if (existingAdminCount > 0) {
        throw new AuthError("An admin account already exists.", 403);
    }

    const email = input.email.toLowerCase();
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new AuthError("An account with this email already exists.", 409);
    }

    const user = await User.create({
        name: input.name,
        email,
        password: await hashPassword(input.password),
        role: "Admin",
        designation: "System Administrator",
        experience: [],
        emailVerified: true,
        isActive: true,
    });

    const token = await createSessionToken({
        sub: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
    });

    await setSessionCookie(token);

    return {
        message: "Admin account created successfully.",
        user: toSafeUser(user),
    };
}

export async function getCurrentUser() {
    const session = await getSessionPayload();

    if (!session?.sub) {
        return null;
    }

    await dbConnect();

    const user = await User.findById(session.sub);

    if (!user || !user.emailVerified) {
        return null;
    }

    return toSafeUser(user);
}

export async function requireAuth() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    if (user.role === "Student" && user.accountStatus === "PendingActivation") {
        redirect(getPostLoginPath(user));
    }

    if (user.role === "Faculty" && user.accountStatus === "PendingActivation") {
        redirect(getPostLoginPath(user));
    }

    return user;
}

export async function requireStudentProfileAccess() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    if (user.role !== "Student") {
        redirect("/");
    }

    if (user.accountStatus === "PendingActivation") {
        redirect("/activate-student");
    }

    return user;
}

export async function requireAdmin() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/admin/login");
    }

    if (user.role !== "Admin") {
        redirect("/");
    }

    return user;
}

export async function requireFaculty() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    if (user.role !== "Faculty") {
        redirect("/");
    }

    if (user.accountStatus === "PendingActivation") {
        redirect("/activate-faculty");
    }

    return user;
}

export async function requireDirector() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/director/login");
    }

    await dbConnect();
    const hasLeadershipAccess = (await resolveAuthorizationProfile(user)).hasLeadershipPortalAccess;

    if (!hasLeadershipAccess) {
        redirect("/");
    }

    return user;
}

export async function redirectIfAuthenticated() {
    const user = await getCurrentUser();

    if (user) {
        redirect(getPostLoginPath(user));
    }
}

export async function redirectAdminIfAuthenticated() {
    const user = await getCurrentUser();

    if (user?.role === "Admin") {
        redirect("/admin");
    }
}

export async function redirectDirectorIfAuthenticated() {
    const user = await getCurrentUser();

    if (!user) {
        return;
    }

    await dbConnect();
    const hasLeadershipAccess = (await resolveAuthorizationProfile(user)).hasLeadershipPortalAccess;

    if (hasLeadershipAccess) {
        redirect("/director");
    }
}

export async function assertAdminApiAccess() {
    const user = await getCurrentUser();

    if (!user || user.role !== "Admin") {
        throw new AuthError("Admin access is required.", 403);
    }

    return user;
}

export async function assertLeadershipApiAccess() {
    const user = await getCurrentUser();

    if (!user) {
        throw new AuthError("Leadership access is required.", 403);
    }

    await dbConnect();
    const hasLeadershipAccess = (await resolveAuthorizationProfile(user)).hasLeadershipPortalAccess;

    if (!hasLeadershipAccess) {
        throw new AuthError("Leadership access is required.", 403);
    }

    return user;
}
