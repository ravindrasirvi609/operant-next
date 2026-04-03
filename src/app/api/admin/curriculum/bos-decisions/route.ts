import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createCurriculumBosDecision } from "@/lib/curriculum/service";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const decision = await createCurriculumBosDecision(
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
            message: "BoS decision created successfully.",
            decision: JSON.parse(JSON.stringify(decision)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
