import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createProvisionedStudentsBulk } from "@/lib/admin/users";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = (await request.json()) as { entries?: unknown };
        const result = await createProvisionedStudentsBulk(body.entries ?? [], {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });

        return NextResponse.json(result, {
            status: result.failed.length ? 207 : 201,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
