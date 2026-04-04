import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { submitGovernanceLeadershipIqacAssignment } from "@/lib/governance-leadership-iqac/service";

export async function POST(
    _request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const { id } = await context.params;
        const assignment = await submitGovernanceLeadershipIqacAssignment(
            {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department,
                collegeName: user.collegeName,
                universityName: user.universityName,
                auditContext: getRequestAuditContext(_request),
            },
            id
        );

        return NextResponse.json({
            message: "Governance Leadership / IQAC assignment submitted successfully.",
            assignment: JSON.parse(JSON.stringify(assignment)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
