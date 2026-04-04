import { NextResponse } from "next/server";

import { assertAdminApiAccess } from "@/lib/auth/user";
import { createApiErrorResponse } from "@/lib/auth/http";
import { updateStatutoryComplianceReport } from "@/lib/accreditation/service";
import { getRequestAuditContext } from "@/lib/audit/request";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const { id } = await context.params;
        const record = await updateStatutoryComplianceReport(
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
            message: "Compliance report updated successfully.",
            record: JSON.parse(JSON.stringify(record)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
