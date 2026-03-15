import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createPbasCategory, getPbasCategories } from "@/lib/pbas/admin";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const categories = await getPbasCategories();
        return NextResponse.json({ categories });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        await assertAdminApiAccess();
        const body = await request.json();
        const category = await createPbasCategory(body);
        return NextResponse.json({ category }, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
