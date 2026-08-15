import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { promoteGraduatedStudentsBulk } from "@/lib/alumni/service";

export async function POST(request: Request) {
    try {
        const actor = await assertAdminApiAccess();

        const result = await promoteGraduatedStudentsBulk({
            actor: { id: actor.id, name: actor.name, role: actor.role },
            auditContext: getRequestAuditContext(request),
        });

        return NextResponse.json({
            message: `Promoted ${result.created.length} graduated student(s) to alumni.`,
            createdCount: result.created.length,
            failed: result.failed,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
