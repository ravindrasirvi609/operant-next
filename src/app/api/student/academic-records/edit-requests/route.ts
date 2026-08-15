import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { getStudentAcademicRecordEditRequests } from "@/lib/student/academic-record-requests";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "Student") {
            return NextResponse.json(
                { message: "Student access required." },
                { status: 403 }
            );
        }

        const requests = await getStudentAcademicRecordEditRequests(user.id);
        return NextResponse.json({ requests });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
