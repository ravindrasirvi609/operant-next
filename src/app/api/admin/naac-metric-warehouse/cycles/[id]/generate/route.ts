import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { generateNaacMetricCycleSnapshot } from "@/lib/naac-metric-warehouse/service";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
    try {
        const admin = await assertAdminApiAccess();
        const { id } = await context.params;

        const workspace = await generateNaacMetricCycleSnapshot(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
                auditContext: getRequestAuditContext(request),
            },
            id
        );

        return NextResponse.json({
            message: "NAAC warehouse snapshot generated successfully.",
            workspace: JSON.parse(JSON.stringify(workspace)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
