import { NextResponse } from "next/server";

import { assertAdminApiAccess } from "@/lib/auth/user";
import { createApiErrorResponse } from "@/lib/auth/http";
import { createComplianceActionItem, getAccreditationAdminConsole } from "@/lib/accreditation/service";
import { getRequestAuditContext } from "@/lib/audit/request";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const consoleData = await getAccreditationAdminConsole();
        return NextResponse.json({ actionItems: consoleData.actionItems });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const record = await createComplianceActionItem(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
                auditContext: getRequestAuditContext(request),
            },
            body
        );
        return NextResponse.json({
            message: "Compliance action item created successfully.",
            record: JSON.parse(JSON.stringify(record)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
