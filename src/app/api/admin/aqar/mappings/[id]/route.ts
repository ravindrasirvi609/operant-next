import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import {
    deleteNaacCriteriaMapping,
    updateNaacCriteriaMapping,
} from "@/lib/naac-criteria-mapping/service";

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
        const mapping = await updateNaacCriteriaMapping(id, body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });
        return NextResponse.json({ mapping });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function DELETE(request: Request, context: RouteContext) {
    try {
        const admin = await assertAdminApiAccess();
        const { id } = await context.params;
        await deleteNaacCriteriaMapping(id, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
