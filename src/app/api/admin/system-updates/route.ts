import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createSystemUpdate, getSystemUpdates } from "@/lib/admin/system";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const updates = await getSystemUpdates();

        return NextResponse.json(updates);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const item = await createSystemUpdate(body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });

        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
