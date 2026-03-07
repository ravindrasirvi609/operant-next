import { NextResponse } from "next/server";

import { getAdminUsers } from "@/lib/admin/users";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const users = await getAdminUsers();

        return NextResponse.json(users);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
