import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createSemester, listSemesters } from "@/lib/admin/academics";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const semesters = await listSemesters();
        return NextResponse.json({ semesters });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const semester = await createSemester(body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });
        return NextResponse.json({ semester }, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
