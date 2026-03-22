import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createProgram, listPrograms } from "@/lib/admin/academics";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const programs = await listPrograms();
        return NextResponse.json({ programs });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const program = await createProgram(body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });
        return NextResponse.json({ program }, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
