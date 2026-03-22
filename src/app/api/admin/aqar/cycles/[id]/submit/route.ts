import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { submitAqarCycle } from "@/lib/aqar-cycle/service";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const { id } = await context.params;
        const cycle = await submitAqarCycle(
            {
                id: user.id,
                name: user.name,
                role: user.role,
                auditContext: getRequestAuditContext(request),
            },
            id
        );
        return NextResponse.json({ message: "AQAR cycle submitted successfully.", cycle });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
