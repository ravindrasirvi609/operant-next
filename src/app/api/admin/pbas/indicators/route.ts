import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createPbasIndicator, getPbasIndicators } from "@/lib/pbas/admin";

export async function GET(request: Request) {
    try {
        await assertAdminApiAccess();
        const { searchParams } = new URL(request.url);
        const categoryId = searchParams.get("categoryId") || undefined;
        const indicators = await getPbasIndicators(categoryId);
        return NextResponse.json({ indicators });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        await assertAdminApiAccess();
        const body = await request.json();
        const indicator = await createPbasIndicator(body);
        return NextResponse.json({ indicator }, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
