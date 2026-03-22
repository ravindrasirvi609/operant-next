import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { deleteCasPromotionRule, updateCasPromotionRule } from "@/lib/cas/admin";

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
        const rule = await updateCasPromotionRule(id, body);
        return NextResponse.json({ rule });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function DELETE(_request: Request, context: RouteContext) {
    try {
        await assertAdminApiAccess();
        const { id } = await context.params;
        await deleteCasPromotionRule(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
