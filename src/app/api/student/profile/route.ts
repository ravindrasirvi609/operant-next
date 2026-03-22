import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { getStudentProfile } from "@/lib/student/service";

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user || user.role !== "Student") {
            return NextResponse.json({ message: "Student access required." }, { status: 403 });
        }

        const result = await getStudentProfile(user.id);

        return NextResponse.json(result);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();

        if (!user || user.role !== "Student") {
            return NextResponse.json({ message: "Student access required." }, { status: 403 });
        }

        return NextResponse.json({
            message:
                "Student self-profile editing has been retired. Use the institutional records workspace for student data entry.",
        }, { status: 410 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
