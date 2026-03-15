import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { updatePbasIndicator } from "@/lib/pbas/admin";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function PATCH(request: Request, context: RouteContext) {
    try {
        await assertAdminApiAccess();
        const { id } = await context.params;
        const body = await request.json();
        const indicator = await updatePbasIndicator(id, body);
        return NextResponse.json({ indicator });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
