import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { createCasApplication } from "@/lib/cas/service";

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const body = await request.json();
        const application = await createCasApplication(
            {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department,
            },
            body
        );

        return NextResponse.json({
            message: "CAS application draft created successfully.",
            application,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
