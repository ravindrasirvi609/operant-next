import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createSsrCycle } from "@/lib/ssr/service";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();

        const cycle = await createSsrCycle(
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
            message: "SSR cycle created successfully.",
            cycle: JSON.parse(JSON.stringify(cycle)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
