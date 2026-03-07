import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { getFacultyEvidence, saveFacultyEvidence } from "@/lib/faculty-evidence/service";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "Faculty") {
            return NextResponse.json({ message: "Faculty access required." }, { status: 403 });
        }

        const evidence = await getFacultyEvidence(user.id);
        return NextResponse.json({ evidence });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "Faculty") {
            return NextResponse.json({ message: "Faculty access required." }, { status: 403 });
        }

        const body = await request.json();
        const evidence = await saveFacultyEvidence(user.id, body);
        return NextResponse.json({ message: "Faculty evidence saved successfully.", evidence });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
