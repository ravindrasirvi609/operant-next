import { NextResponse } from "next/server";

import { assertAdminApiAccess } from "@/lib/auth/user";
import { createApiErrorResponse } from "@/lib/auth/http";
import { createStatutoryComplianceReport, getAccreditationAdminConsole } from "@/lib/accreditation/service";
import { getRequestAuditContext } from "@/lib/audit/request";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const consoleData = await getAccreditationAdminConsole();
        return NextResponse.json({ reports: consoleData.reports });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const record = await createStatutoryComplianceReport(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
                auditContext: getRequestAuditContext(request),
            },
            body
        );
        return NextResponse.json({
            message: "Compliance report created successfully.",
            record: JSON.parse(JSON.stringify(record)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
