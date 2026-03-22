import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createOrganization, getHierarchyData } from "@/lib/admin/hierarchy";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const data = await getHierarchyData();

        return NextResponse.json(data);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const organization = await createOrganization(body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });

        return NextResponse.json(organization, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
