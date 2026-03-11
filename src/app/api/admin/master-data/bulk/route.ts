import { NextResponse } from "next/server";

import { createMasterDataEntriesBulk } from "@/lib/admin/master-data";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = (await request.json()) as { entries?: unknown };
        const result = await createMasterDataEntriesBulk(body.entries ?? [], admin.id);

        return NextResponse.json(result, {
            status: result.failed.length ? 207 : 201,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
