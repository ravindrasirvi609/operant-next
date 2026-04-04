import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { saveInstitutionalValuesBestPracticesContributionDraft } from "@/lib/institutional-values-best-practices/service";

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
        const assignment = await saveInstitutionalValuesBestPracticesContributionDraft(
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
            message: "Institutional values draft saved successfully.",
            assignment: JSON.parse(JSON.stringify(assignment)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
