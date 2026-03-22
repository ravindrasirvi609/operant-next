import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { createAqarCycle, listAqarCycles } from "@/lib/aqar-cycle/service";

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const cycles = await listAqarCycles({
            id: user.id,
            name: user.name,
            role: user.role,
        });

        return NextResponse.json({ cycles });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const body = await request.json();
        const cycle = await createAqarCycle(
            {
                id: user.id,
                name: user.name,
                role: user.role,
                auditContext: getRequestAuditContext(request),
            },
            body
        );

        return NextResponse.json({
            message: "AQAR cycle created successfully.",
            cycle,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
