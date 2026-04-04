import { NextResponse } from "next/server";

import { assertAdminApiAccess } from "@/lib/auth/user";
import { createApiErrorResponse } from "@/lib/auth/http";
import { updateNirfCycle } from "@/lib/accreditation/service";
import { getRequestAuditContext } from "@/lib/audit/request";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
    try {
        const admin = await assertAdminApiAccess();
        const { id } = await context.params;
        const body = await request.json();
        const cycle = await updateNirfCycle(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
                auditContext: getRequestAuditContext(request),
            },
            id,
            body
        );
        return NextResponse.json({
            message: "NIRF cycle updated successfully.",
            cycle: JSON.parse(JSON.stringify(cycle)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
