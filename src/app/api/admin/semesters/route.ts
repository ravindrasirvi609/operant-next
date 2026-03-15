import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createSemester, listSemesters } from "@/lib/admin/academics";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const semesters = await listSemesters();
        return NextResponse.json({ semesters });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        await assertAdminApiAccess();
        const body = await request.json();
        const semester = await createSemester(body);
        return NextResponse.json({ semester }, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
