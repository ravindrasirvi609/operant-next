import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { updateOrganization } from "@/lib/admin/hierarchy";
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
        const organization = await updateOrganization(id, body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });

        return NextResponse.json(organization);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
