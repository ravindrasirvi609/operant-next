import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { requireStudentProfileAccess } from "@/lib/auth/user";
import { submitStudentSssResponse } from "@/lib/accreditation/service";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
    try {
        const student = await requireStudentProfileAccess();
        const { id } = await context.params;
        const body = await request.json();
        const result = await submitStudentSssResponse(
            {
                id: student.id,
                name: student.name,
                role: student.role,
            },
            id,
            body
        );
        return NextResponse.json(result);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
