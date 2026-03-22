import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createGovernanceCommittee } from "@/lib/governance/service";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const committee = await createGovernanceCommittee(body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });

        return NextResponse.json(committee, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
