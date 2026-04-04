import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import {
    createNaacMetricCycle,
    listNaacMetricCycles,
} from "@/lib/naac-metric-warehouse/service";

export async function GET() {
    try {
        const admin = await assertAdminApiAccess();
        const cycles = await listNaacMetricCycles({
            id: admin.id,
            name: admin.name,
            role: admin.role,
        });

        return NextResponse.json({
            cycles: JSON.parse(JSON.stringify(cycles)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();

        const cycle = await createNaacMetricCycle(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
                auditContext: getRequestAuditContext(request),
            },
            body
        );

        return NextResponse.json({
            message: "NAAC metric cycle created successfully.",
            cycle: JSON.parse(JSON.stringify(cycle)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
