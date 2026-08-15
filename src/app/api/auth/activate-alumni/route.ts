import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { activateAlumniAccount } from "@/lib/auth/user";

export async function POST(request: Request) {
    try {
        enforceRateLimit(request, "auth:activate-alumni");
        const body = await request.json();
        const result = await activateAlumniAccount(body);

        return NextResponse.json(result);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
