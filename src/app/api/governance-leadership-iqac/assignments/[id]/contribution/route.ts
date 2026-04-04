import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { saveGovernanceLeadershipIqacContributionDraft } from "@/lib/governance-leadership-iqac/service";

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const body = await request.json();
        const { id } = await context.params;
        const assignment = await saveGovernanceLeadershipIqacContributionDraft(
            {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department,
                collegeName: user.collegeName,
                universityName: user.universityName,
            },
            id,
            body
        );

        return NextResponse.json({
            message: "Governance Leadership / IQAC draft saved successfully.",
            assignment: JSON.parse(JSON.stringify(assignment)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
