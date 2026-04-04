import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createInstitutionalValuesBestPracticesPlan } from "@/lib/institutional-values-best-practices/service";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const plan = await createInstitutionalValuesBestPracticesPlan(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
                department: admin.department,
                collegeName: admin.collegeName,
                universityName: admin.universityName,
                auditContext: getRequestAuditContext(request),
            },
            body
        );

        return NextResponse.json({
            message: "Institutional values plan created successfully.",
            plan: JSON.parse(JSON.stringify(plan)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
