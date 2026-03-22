import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { deleteAcademicYear, updateAcademicYear } from "@/lib/admin/academics";

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
        const academicYear = await updateAcademicYear(id, body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });
        return NextResponse.json({ academicYear });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function DELETE(request: Request, context: RouteContext) {
    try {
        const admin = await assertAdminApiAccess();
        const { id } = await context.params;
        await deleteAcademicYear(id, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });
        return NextResponse.json({ message: "Academic year deleted." });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
