import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { submitSsrMetricResponse } from "@/lib/ssr/service";

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

        const response = await submitSsrMetricResponse(
            {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department,
            },
            id
        );

        return NextResponse.json({
            message: "SSR response submitted successfully.",
            response: JSON.parse(JSON.stringify(response)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
