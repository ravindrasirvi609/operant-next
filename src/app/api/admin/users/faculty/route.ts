import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createProvisionedFaculty } from "@/lib/admin/users";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const user = await createProvisionedFaculty(body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
