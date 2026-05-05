import { NextResponse } from "next/server";

import { ADMIN_BOOTSTRAP_SECRET_HEADER } from "@/lib/auth/constants";
import { createApiErrorResponse } from "@/lib/auth/http";
import { bootstrapAdmin } from "@/lib/auth/user";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const bootstrapSecret = request.headers.get(ADMIN_BOOTSTRAP_SECRET_HEADER);
        const result = await bootstrapAdmin(body, { bootstrapSecret });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
