import { NextResponse } from "next/server";

import { createProvisionedFacultyBulk } from "@/lib/admin/users";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

export async function POST(request: Request) {
    try {
        await assertAdminApiAccess();
        const body = (await request.json()) as { entries?: unknown };
        const result = await createProvisionedFacultyBulk(body.entries ?? []);

        return NextResponse.json(result, {
            status: result.failed.length ? 207 : 201,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
