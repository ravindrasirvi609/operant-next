import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createSsrMetric } from "@/lib/ssr/service";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();

        const metric = await createSsrMetric(
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
            message: "SSR metric created successfully.",
            metric: JSON.parse(JSON.stringify(metric)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
