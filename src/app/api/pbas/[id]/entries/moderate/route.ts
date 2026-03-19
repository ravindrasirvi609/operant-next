import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { moderatePbasEntriesForForm } from "@/lib/pbas/service";

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
        const body = await request.json();

        const entries = await moderatePbasEntriesForForm(
            { id: user.id, name: user.name, role: user.role, department: user.department },
            id,
            body
        );

        return NextResponse.json({
            message: "PBAS indicator approvals updated successfully.",
            entries,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
