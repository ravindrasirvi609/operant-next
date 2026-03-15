import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createAcademicYear, listAcademicYears } from "@/lib/admin/academics";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const academicYears = await listAcademicYears();
        return NextResponse.json({ academicYears });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        await assertAdminApiAccess();
        const body = await request.json();
        const academicYear = await createAcademicYear(body);
        return NextResponse.json({ academicYear }, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
