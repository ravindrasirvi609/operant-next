import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { getAlumniProfile, updateAlumniProfile } from "@/lib/alumni/service";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "Alumni") {
            return NextResponse.json({ message: "Alumni access required." }, { status: 403 });
        }

        const result = await getAlumniProfile(user.id);
        return NextResponse.json(result);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function PUT(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "Alumni") {
            return NextResponse.json({ message: "Alumni access required." }, { status: 403 });
        }

        const body = await request.json();
        const alumni = await updateAlumniProfile(user.id, body);
        return NextResponse.json({ message: "Profile updated.", alumni });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
