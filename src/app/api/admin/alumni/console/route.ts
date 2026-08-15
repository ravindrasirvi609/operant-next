import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { getAlumniAdminConsole } from "@/lib/alumni/service";

export async function GET() {
    try {
        const actor = await assertAdminApiAccess();
        const result = await getAlumniAdminConsole({ id: actor.id, name: actor.name, role: actor.role });
        return NextResponse.json(result);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
