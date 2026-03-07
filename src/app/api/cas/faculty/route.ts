import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { getFacultyCasApplications } from "@/lib/cas/service";

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const applications = await getFacultyCasApplications({
            id: user.id,
            name: user.name,
            role: user.role,
            department: user.department,
        });

        return NextResponse.json({ applications });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
