import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { updateMasterDataEntry } from "@/lib/admin/master-data";
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
        const item = await updateMasterDataEntry(id, body, admin.id, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });

        return NextResponse.json(item);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
