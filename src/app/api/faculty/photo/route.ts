import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/core/user";

/**
 * POST /api/faculty/photo
 *
 * Receives { photoURL } after the client-side Firebase upload completes
 * and persists the URL on the User document.
 */
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();

        if (!user || user.role !== "Faculty") {
            return NextResponse.json(
                { message: "Faculty access required." },
                { status: 403 },
            );
        }

        const body = (await request.json()) as { photoURL?: string };

        if (typeof body.photoURL !== "string") {
            return NextResponse.json(
                { message: "photoURL is required." },
                { status: 400 },
            );
        }

        // Allow clearing the photo.
        if (body.photoURL === "") {
            await dbConnect();
            await User.findByIdAndUpdate(user.id, { $unset: { photoURL: 1 } });
            return NextResponse.json({ message: "Profile photo removed.", photoURL: "" });
        }

        // Only allow Firebase Storage URLs from the configured bucket.
        const bucketHost = `${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}`;
        const isFirebaseURL =
            body.photoURL.startsWith("https://firebasestorage.googleapis.com/") &&
            body.photoURL.includes(bucketHost);

        if (!isFirebaseURL) {
            return NextResponse.json(
                { message: "Invalid photo URL." },
                { status: 400 },
            );
        }

        await dbConnect();

        await User.findByIdAndUpdate(user.id, { photoURL: body.photoURL });

        return NextResponse.json({ message: "Profile photo updated.", photoURL: body.photoURL });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
