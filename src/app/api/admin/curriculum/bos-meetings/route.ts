import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createCurriculumBosMeeting } from "@/lib/curriculum/service";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const meeting = await createCurriculumBosMeeting(
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
            message: "BoS meeting created successfully.",
            meeting: JSON.parse(JSON.stringify(meeting)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
