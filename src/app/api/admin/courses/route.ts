import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
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
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const course = await createCourse(body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });
        return NextResponse.json({ course }, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
