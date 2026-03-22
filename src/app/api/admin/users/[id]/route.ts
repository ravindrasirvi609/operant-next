import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { updateAdminUser } from "@/lib/admin/users";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

type RouteProps = {
    params: Promise<{
        id: string;
    }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
    try {
        const admin = await assertAdminApiAccess();
        const { id } = await params;
        const body = await request.json();
        const user = await updateAdminUser(id, body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });

        return NextResponse.json(user);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
