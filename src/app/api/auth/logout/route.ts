import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { logoutUser } from "@/lib/auth/user";

export async function POST() {
    try {
        const result = await logoutUser();

        return NextResponse.json(result);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
