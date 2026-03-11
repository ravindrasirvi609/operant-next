import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { getFacultyEvidenceDefaults } from "@/lib/faculty-evidence/service";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "Faculty") {
            return NextResponse.json({ message: "Faculty access required." }, { status: 403 });
        }

        const defaults = await getFacultyEvidenceDefaults(user.id);
        return NextResponse.json({ defaults });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
