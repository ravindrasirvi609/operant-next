import { NextResponse } from "next/server";

import { updateOrganization } from "@/lib/admin/hierarchy";
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
        const organization = await updateOrganization(id, body);

        return NextResponse.json(organization);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
