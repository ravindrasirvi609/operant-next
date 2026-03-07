import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { approveCasApplication } from "@/lib/cas/service";

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
        const application = await approveCasApplication(
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
            message: "CAS application finalized successfully.",
            application,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
