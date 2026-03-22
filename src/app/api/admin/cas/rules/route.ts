import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
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
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const rule = await createCasPromotionRule(body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });
        return NextResponse.json({ rule }, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
