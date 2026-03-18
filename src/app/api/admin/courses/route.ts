import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createCourse, listCourses } from "@/lib/admin/academics";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const courses = await listCourses();
        return NextResponse.json({ courses });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        await assertAdminApiAccess();
        const body = await request.json();
        const course = await createCourse(body);
        return NextResponse.json({ course }, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
