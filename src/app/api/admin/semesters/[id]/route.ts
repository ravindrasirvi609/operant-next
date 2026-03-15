import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { updateSemester } from "@/lib/admin/academics";

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
        const semester = await updateSemester(id, body);
        return NextResponse.json({ semester });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
