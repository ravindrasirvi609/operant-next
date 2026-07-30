import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { requestPasswordReset } from "@/lib/auth/user";

export async function POST(request: Request) {
    try {
        enforceRateLimit(request, "auth:forgot-password");
        const body = await request.json();
        const result = await requestPasswordReset(body);

        return NextResponse.json(result);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
