import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { updateCurriculumCalendar } from "@/lib/curriculum/service";

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const { id } = await context.params;
        const calendar = await updateCurriculumCalendar(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
                department: admin.department,
                auditContext: getRequestAuditContext(request),
            },
            id,
            body
        );

        return NextResponse.json({
            message: "Academic calendar updated successfully.",
            calendar: JSON.parse(JSON.stringify(calendar)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
