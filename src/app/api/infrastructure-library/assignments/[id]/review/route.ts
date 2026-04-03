import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { reviewInfrastructureLibraryAssignment } from "@/lib/infrastructure-library/service";

export async function POST(
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
        const assignment = await reviewInfrastructureLibraryAssignment(
            {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department,
                collegeName: user.collegeName,
                universityName: user.universityName,
                auditContext: getRequestAuditContext(request),
            },
            id,
            body
        );

        return NextResponse.json({
            message: "Infrastructure & library review recorded successfully.",
            assignment: JSON.parse(JSON.stringify(assignment)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
