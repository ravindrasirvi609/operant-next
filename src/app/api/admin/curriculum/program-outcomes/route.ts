import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createCurriculumProgramOutcome } from "@/lib/curriculum/service";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const outcome = await createCurriculumProgramOutcome(
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
            message: "Program outcome created successfully.",
            outcome: JSON.parse(JSON.stringify(outcome)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
