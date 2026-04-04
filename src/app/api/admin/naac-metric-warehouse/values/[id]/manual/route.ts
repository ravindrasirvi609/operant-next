import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { updateManualNaacMetricValue } from "@/lib/naac-metric-warehouse/service";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
    try {
        const admin = await assertAdminApiAccess();
        const { id } = await context.params;
        const body = await request.json();

        const metric = await updateManualNaacMetricValue(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
                auditContext: getRequestAuditContext(request),
            },
            id,
            body
        );

        return NextResponse.json({
            message: "Manual warehouse value saved successfully.",
            metric: JSON.parse(JSON.stringify(metric)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
