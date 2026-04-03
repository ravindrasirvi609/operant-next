import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createCurriculumValueAddedCourse } from "@/lib/curriculum/service";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const valueAddedCourse = await createCurriculumValueAddedCourse(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
                department: admin.department,
                auditContext: getRequestAuditContext(request),
            },
            body
        );

        return NextResponse.json({
            message: "Value added course created successfully.",
            valueAddedCourse: JSON.parse(JSON.stringify(valueAddedCourse)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
