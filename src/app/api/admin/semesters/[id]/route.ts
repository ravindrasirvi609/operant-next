import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { deleteSemester, updateSemester } from "@/lib/admin/academics";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function PATCH(request: Request, context: RouteContext) {
    try {
        const admin = await assertAdminApiAccess();
        const { id } = await context.params;
        const body = await request.json();
        const semester = await updateSemester(id, body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });
        return NextResponse.json({ semester });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function DELETE(request: Request, context: RouteContext) {
    try {
        const admin = await assertAdminApiAccess();
        const { id } = await context.params;
        await deleteSemester(id, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });
        return NextResponse.json({ message: "Semester deleted." });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
