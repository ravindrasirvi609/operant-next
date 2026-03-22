import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import {
    createNaacCriteriaMapping,
    listNaacCriteriaMappings,
} from "@/lib/naac-criteria-mapping/service";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const mappings = await listNaacCriteriaMappings();
        return NextResponse.json({ mappings });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const mapping = await createNaacCriteriaMapping(body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });
        return NextResponse.json({ mapping }, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
