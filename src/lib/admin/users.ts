import dbConnect from "@/lib/dbConnect";
import { adminUserUpdateSchema } from "@/lib/admin/validators";
import { AuthError } from "@/lib/auth/errors";
import User from "@/models/core/user";

export async function getAdminUsers() {
    await dbConnect();

    return User.find()
        .sort({ createdAt: -1 })
        .select(
            "name email role universityName collegeName department phone emailVerified isActive lastLoginAt createdAt"
        );
}

export async function updateAdminUser(userId: string, rawInput: unknown) {
    const input = adminUserUpdateSchema.parse(rawInput);

    await dbConnect();

    const user = await User.findById(userId);

    if (!user) {
        throw new AuthError("User not found.", 404);
    }

    if (input.role !== undefined) {
        user.role = input.role;
    }

    if (input.isActive !== undefined) {
        user.isActive = input.isActive;
    }

    if (input.emailVerified !== undefined) {
        user.emailVerified = input.emailVerified;
    }

    if (input.universityName !== undefined) {
        user.universityName = input.universityName || undefined;
    }

    if (input.collegeName !== undefined) {
        user.collegeName = input.collegeName || undefined;
    }

    if (input.department !== undefined) {
        user.department = input.department || undefined;
    }

    await user.save();

    return user;
}
