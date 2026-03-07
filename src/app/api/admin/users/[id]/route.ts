import { NextResponse } from "next/server";

import { updateAdminUser } from "@/lib/admin/users";
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
        const user = await updateAdminUser(id, body);

        return NextResponse.json(user);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
