import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { getPbasSummaryForFaculty } from "@/lib/pbas/service";

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user || user.role !== "Faculty") {
            return NextResponse.json({ message: "Faculty access required." }, { status: 403 });
        }

        const summary = await getPbasSummaryForFaculty({
            id: user.id,
            name: user.name,
            role: user.role,
            department: user.department,
        });

        return NextResponse.json({ summary });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

