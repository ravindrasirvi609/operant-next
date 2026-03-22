import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { updateReportTemplate } from "@/lib/report-templates/service";

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await assertAdminApiAccess();
        const body = await request.json();
        const { id } = await context.params;

        const template = await updateReportTemplate(id, body, {
            actor: { id: user.id, name: user.name, role: user.role },
            auditContext: getRequestAuditContext(request),
        });

        return NextResponse.json({
            message: "Report template version created successfully.",
            template: JSON.parse(JSON.stringify(template)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
