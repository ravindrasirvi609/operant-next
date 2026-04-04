import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { updateGovernanceLeadershipIqacAssignment } from "@/lib/governance-leadership-iqac/service";

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const { id } = await context.params;
        const assignment = await updateGovernanceLeadershipIqacAssignment(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
                department: admin.department,
                collegeName: admin.collegeName,
                universityName: admin.universityName,
                auditContext: getRequestAuditContext(request),
            },
            id,
            body
        );

        return NextResponse.json({
            message: "Governance Leadership / IQAC assignment updated successfully.",
            assignment: JSON.parse(JSON.stringify(assignment)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
