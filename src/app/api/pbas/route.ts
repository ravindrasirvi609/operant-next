import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { createPbasApplication } from "@/lib/pbas/service";

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const body = await request.json();
        const application = await createPbasApplication(
            {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department,
            },
            body
        );

        return NextResponse.json({
            message: "PBAS application draft created successfully.",
            application,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
