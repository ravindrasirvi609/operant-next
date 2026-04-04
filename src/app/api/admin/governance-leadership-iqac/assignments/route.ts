import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createGovernanceLeadershipIqacAssignment } from "@/lib/governance-leadership-iqac/service";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const assignment = await createGovernanceLeadershipIqacAssignment(
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
            message: "Governance Leadership / IQAC assignment created successfully.",
            assignment: JSON.parse(JSON.stringify(assignment)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
