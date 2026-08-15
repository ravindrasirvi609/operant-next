import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminOrLeadershipApiAccess } from "@/lib/auth/user";
import { getAcademicRecordEditRequestQueue } from "@/lib/student/academic-record-requests";

export async function GET() {
    try {
        const actor = await assertAdminOrLeadershipApiAccess();
        const requests = await getAcademicRecordEditRequestQueue({
            id: actor.id,
            name: actor.name,
            role: actor.role,
        });

        return NextResponse.json({ requests });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
