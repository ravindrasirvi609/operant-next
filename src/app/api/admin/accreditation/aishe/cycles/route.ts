import { NextResponse } from "next/server";

import { assertAdminApiAccess } from "@/lib/auth/user";
import { createApiErrorResponse } from "@/lib/auth/http";
import { createAisheCycle, getAccreditationAdminConsole } from "@/lib/accreditation/service";
import { getRequestAuditContext } from "@/lib/audit/request";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const consoleData = await getAccreditationAdminConsole();
        return NextResponse.json({ cycles: consoleData.aisheCycles });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const cycle = await createAisheCycle(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
                auditContext: getRequestAuditContext(request),
            },
            body
        );
        return NextResponse.json({
            message: "AISHE cycle created successfully.",
            cycle: JSON.parse(JSON.stringify(cycle)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
