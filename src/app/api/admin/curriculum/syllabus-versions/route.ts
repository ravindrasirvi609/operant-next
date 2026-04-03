import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createCurriculumSyllabusVersion } from "@/lib/curriculum/service";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const version = await createCurriculumSyllabusVersion(
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
            message: "Syllabus version created successfully.",
            version: JSON.parse(JSON.stringify(version)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
