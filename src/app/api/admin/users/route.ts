import { NextResponse } from "next/server";

import { createProvisionedStudent, getAdminUsers } from "@/lib/admin/users";
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

export async function POST(request: Request) {
    try {
        await assertAdminApiAccess();
        const body = await request.json();
        const user = await createProvisionedStudent(body);

        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
