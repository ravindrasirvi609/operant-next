import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createProgram, listPrograms } from "@/lib/admin/academics";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const programs = await listPrograms();
        return NextResponse.json({ programs });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        await assertAdminApiAccess();
        const body = await request.json();
        const program = await createProgram(body);
        return NextResponse.json({ program }, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
