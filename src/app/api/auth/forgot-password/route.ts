import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { requestPasswordReset } from "@/lib/auth/user";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const result = await requestPasswordReset(body);

        return NextResponse.json(result);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
