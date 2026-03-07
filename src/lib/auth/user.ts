import { redirect } from "next/navigation";

import dbConnect from "@/lib/dbConnect";
import { clearSessionCookie, createSessionToken, getSessionPayload, setSessionCookie } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/errors";
import { authConfig } from "@/lib/auth/config";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/auth/email";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { addHours, addMinutes, createRandomToken, hashToken } from "@/lib/auth/tokens";
import {
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resendVerificationSchema,
    resetPasswordSchema,
} from "@/lib/auth/validators";
import User, { IUser } from "@/models/core/user";

type SafeUser = {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    schoolName?: string;
    designation?: string;
    phone?: string;
    emailVerified: boolean;
    studentDetails?: IUser["studentDetails"];
    lastLoginAt?: Date;
};

function toSafeUser(user: IUser): SafeUser {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        schoolName: user.schoolName,
        designation: user.designation,
        phone: user.phone,
        emailVerified: user.emailVerified,
        studentDetails: user.studentDetails,
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
        department: input.department,
        schoolName: input.schoolName,
        designation: input.role === "Faculty" ? input.designation : undefined,
        studentDetails:
            input.role === "Student"
                ? {
                      rollNo: input.rollNo,
                      course: input.course,
                      batch: input.batch,
                      admissionYear: input.admissionYear,
                  }
                : undefined,
        qualifications: [],
        experience: [],
        emailVerified: false,
    });

    await issueVerificationToken(user);

    return {
        message: "Registration successful. Check your email to verify your account.",
    };
}

export async function loginUser(rawInput: unknown) {
    const input = loginSchema.parse(rawInput);

    await dbConnect();

    const user = await User.findOne({ email: input.email.toLowerCase() }).select("+password");

    if (!user?.password) {
        throw new AuthError("Invalid email or password.", 401);
    }

    const isValidPassword = await verifyPassword(input.password, user.password);

    if (!isValidPassword) {
        throw new AuthError("Invalid email or password.", 401);
    }

    if (!user.isActive) {
        throw new AuthError("This UMIS account has been deactivated.", 403);
    }

    if (!user.emailVerified) {
        throw new AuthError("Verify your email before signing in.", 403);
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

    return {
        message: "Login successful.",
        user: toSafeUser(user),
    };
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

    if (user && user.emailVerified && user.isActive) {
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

    if (user && !user.emailVerified && user.isActive) {
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
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    return {
        success: true,
        message: "Email verified. You can now sign in to UMIS.",
    };
}

export async function getCurrentUser() {
    const session = await getSessionPayload();

    if (!session?.sub) {
        return null;
    }

    await dbConnect();

    const user = await User.findById(session.sub);

    if (!user || !user.isActive || !user.emailVerified) {
        return null;
    }

    return toSafeUser(user);
}

export async function requireAuth() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    return user;
}

export async function redirectIfAuthenticated() {
    const user = await getCurrentUser();

    if (user) {
        redirect("/");
    }
}
