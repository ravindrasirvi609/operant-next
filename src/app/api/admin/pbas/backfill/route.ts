import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { backfillPbasLegacyToFacultyRecords } from "@/lib/pbas/migration";

export async function POST(request: Request) {
    try {
        await assertAdminApiAccess();
        const body = await request.json().catch(() => ({}));
        const limit = typeof body?.limit === "number" ? body.limit : undefined;
        const result = await backfillPbasLegacyToFacultyRecords({ limit });
        return NextResponse.json({
            message: "PBAS legacy backfill completed.",
            result,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
