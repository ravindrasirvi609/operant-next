import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import {
    getEvidenceDashboardSummary,
    listStudentEvidenceForReview,
} from "@/lib/evidence/service";

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: "Authentication required." }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = (searchParams.get("status") ?? "Pending") as
            | "Pending"
            | "Verified"
            | "Rejected"
            | "All";

        const actor = { id: user.id, name: user.name, role: user.role };
        const [items, summary] = await Promise.all([
            listStudentEvidenceForReview(actor, status),
            getEvidenceDashboardSummary(actor),
        ]);

        return NextResponse.json({ items, summary });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
