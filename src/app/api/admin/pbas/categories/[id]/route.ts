import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { updatePbasCategory } from "@/lib/pbas/admin";

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
        const category = await updatePbasCategory(id, body);
        return NextResponse.json({ category });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
