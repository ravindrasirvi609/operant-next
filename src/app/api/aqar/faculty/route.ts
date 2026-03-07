import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { getFacultyAqarApplications } from "@/lib/aqar/service";

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const applications = await getFacultyAqarApplications({
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
