import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createSsrNarrativeSection } from "@/lib/ssr/service";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();

        const section = await createSsrNarrativeSection(
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
            message: "SSR narrative section created successfully.",
            section: JSON.parse(JSON.stringify(section)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
