import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { createAqarApplication } from "@/lib/aqar/service";

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const body = await request.json();
        const application = await createAqarApplication(
            {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department,
                auditContext: getRequestAuditContext(request),
            },
            body
        );

        return NextResponse.json({
            message: "AQAR application draft created successfully.",
            application,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
