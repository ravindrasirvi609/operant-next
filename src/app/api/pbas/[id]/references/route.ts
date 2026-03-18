import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { updatePbasDraftReferences } from "@/lib/pbas/service";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const body = await request.json();
        const { id } = await context.params;
        const application = await updatePbasDraftReferences(
            { id: user.id, name: user.name, role: user.role, department: user.department },
            id,
            body
        );

        return NextResponse.json({
            message: "PBAS draft references updated successfully.",
            application,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
