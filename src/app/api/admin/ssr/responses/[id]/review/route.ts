import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { reviewSsrMetricResponse } from "@/lib/ssr/service";

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const { id } = await context.params;

        const response = await reviewSsrMetricResponse(
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
            message: "SSR response reviewed successfully.",
            response: JSON.parse(JSON.stringify(response)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
