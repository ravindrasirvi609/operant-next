import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { getStudentSemesters } from "@/lib/student/records-service";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "Student") {
            return NextResponse.json(
                { message: "Student access required." },
                { status: 403 }
            );
        }

        const semesters = await getStudentSemesters(user.id);
        return NextResponse.json({ semesters: JSON.parse(JSON.stringify(semesters)) });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
