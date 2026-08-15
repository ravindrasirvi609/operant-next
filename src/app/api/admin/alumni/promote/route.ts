import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { promoteStudentToAlumni } from "@/lib/alumni/service";

export async function POST(request: Request) {
    try {
        const actor = await assertAdminApiAccess();
        const body = await request.json();

        const result = await promoteStudentToAlumni(body, {
            actor: { id: actor.id, name: actor.name, role: actor.role },
            auditContext: getRequestAuditContext(request),
        });

        return NextResponse.json({
            message: "Student promoted to alumni.",
            alumni: JSON.parse(JSON.stringify(result.alumni)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
