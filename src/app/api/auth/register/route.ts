import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { registerUser } from "@/lib/auth/user";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const result = await registerUser(body);

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
