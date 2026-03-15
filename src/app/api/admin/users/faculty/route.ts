import { NextResponse } from "next/server";

import { createProvisionedFaculty } from "@/lib/admin/users";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

export async function POST(request: Request) {
    try {
        await assertAdminApiAccess();
        const body = await request.json();
        const user = await createProvisionedFaculty(body);

        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
