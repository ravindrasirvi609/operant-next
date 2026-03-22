import { NextResponse } from "next/server";

import { listAuditLogs } from "@/lib/audit/service";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

export async function GET(request: Request) {
    try {
        await assertAdminApiAccess();

        const { searchParams } = new URL(request.url);
        const result = await listAuditLogs({
            page: searchParams.get("page") ?? undefined,
            pageSize: searchParams.get("pageSize") ?? undefined,
            action: searchParams.get("action") ?? undefined,
            tableName: searchParams.get("tableName") ?? undefined,
            recordId: searchParams.get("recordId") ?? undefined,
            userId: searchParams.get("userId") ?? undefined,
            query: searchParams.get("query") ?? undefined,
            startDate: searchParams.get("startDate") ?? undefined,
            endDate: searchParams.get("endDate") ?? undefined,
        });

        return NextResponse.json(result);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
