import { NextResponse } from "next/server";

import { createSystemUpdate, getSystemUpdates } from "@/lib/admin/system";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const updates = await getSystemUpdates();

        return NextResponse.json(updates);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        await assertAdminApiAccess();
        const body = await request.json();
        const item = await createSystemUpdate(body);

        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
