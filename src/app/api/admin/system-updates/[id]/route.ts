import { NextResponse } from "next/server";

import { updateSystemUpdate } from "@/lib/admin/system";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

type RouteProps = {
    params: Promise<{
        id: string;
    }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
    try {
        await assertAdminApiAccess();
        const { id } = await params;
        const body = await request.json();
        const item = await updateSystemUpdate(id, body);

        return NextResponse.json(item);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
