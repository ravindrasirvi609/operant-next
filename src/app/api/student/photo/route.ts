import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/core/user";

/**
 * POST /api/student/photo
 *
 * Receives { photoURL } after the client-side Firebase upload completes
 * and persists the URL on the User document.
 */
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();

        if (!user || user.role !== "Student") {
            return NextResponse.json(
                { message: "Student access required." },
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

        // Only allow URLs from the configured R2 public bucket.
        const r2Base = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;
        if (!r2Base || !body.photoURL.startsWith(r2Base)) {
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
