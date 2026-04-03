import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { updateCurriculumValueAddedCourse } from "@/lib/curriculum/service";

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const { id } = await context.params;
        const valueAddedCourse = await updateCurriculumValueAddedCourse(
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
            message: "Value added course updated successfully.",
            valueAddedCourse: JSON.parse(JSON.stringify(valueAddedCourse)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
