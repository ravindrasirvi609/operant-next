import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createCasPromotionRule, getCasPromotionRules } from "@/lib/cas/admin";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const rules = await getCasPromotionRules();
        return NextResponse.json({ rules });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        await assertAdminApiAccess();
        const body = await request.json();
        const rule = await createCasPromotionRule(body);
        return NextResponse.json({ rule }, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
