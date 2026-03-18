import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { deleteCourse, updateCourse } from "@/lib/admin/academics";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function PATCH(request: Request, context: RouteContext) {
    try {
        await assertAdminApiAccess();
        const { id } = await context.params;
        const body = await request.json();
        const course = await updateCourse(id, body);
        return NextResponse.json({ course });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function DELETE(_request: Request, context: RouteContext) {
    try {
        await assertAdminApiAccess();
        const { id } = await context.params;
        await deleteCourse(id);
        return NextResponse.json({ message: "Course deleted." });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
