import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { submitStudentProfile } from "@/lib/student/service";

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();

        if (!user || user.role !== "Student") {
            return NextResponse.json({ message: "Student access required." }, { status: 403 });
        }

        const body = await request.json();
        const result = await submitStudentProfile(user.id, body);

        return NextResponse.json({
            message: result.message,
            redirectPath: result.redirectPath,
            studentDetails: result.user.studentDetails,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
