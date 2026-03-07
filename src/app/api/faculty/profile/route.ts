import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { getFacultyWorkspace, saveFacultyWorkspace } from "@/lib/faculty/service";

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user || user.role !== "Faculty") {
            return NextResponse.json({ message: "Faculty access required." }, { status: 403 });
        }

        const workspace = await getFacultyWorkspace(user.id);

        return NextResponse.json(workspace);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();

        if (!user || user.role !== "Faculty") {
            return NextResponse.json({ message: "Faculty access required." }, { status: 403 });
        }

        const body = await request.json();
        const result = await saveFacultyWorkspace(user.id, body);

        return NextResponse.json({
            message: result.message,
            facultyRecord: result.facultyRecord,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
