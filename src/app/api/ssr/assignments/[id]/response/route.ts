import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { saveSsrMetricResponseDraft } from "@/lib/ssr/service";

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

        const response = await saveSsrMetricResponseDraft(
            {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department,
            },
            id,
            body
        );

        return NextResponse.json({
            message: "SSR response draft saved successfully.",
            response: JSON.parse(JSON.stringify(response)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
