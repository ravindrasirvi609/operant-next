import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { getNaacMetricCycleWorkspace } from "@/lib/naac-metric-warehouse/service";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
    try {
        const admin = await assertAdminApiAccess();
        const { id } = await context.params;

        const workspace = await getNaacMetricCycleWorkspace(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
            },
            id
        );

        return NextResponse.json({
            workspace: JSON.parse(JSON.stringify(workspace)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
