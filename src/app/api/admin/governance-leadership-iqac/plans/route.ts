import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createGovernanceLeadershipIqacPlan } from "@/lib/governance-leadership-iqac/service";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const plan = await createGovernanceLeadershipIqacPlan(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
                department: admin.department,
                collegeName: admin.collegeName,
                universityName: admin.universityName,
                auditContext: getRequestAuditContext(request),
            },
            body
        );

        return NextResponse.json({
            message: "Governance Leadership / IQAC plan created successfully.",
            plan: JSON.parse(JSON.stringify(plan)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
