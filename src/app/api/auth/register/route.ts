import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";

export async function POST(request: Request) {
    try {
        await request.json();
        return NextResponse.json(
            {
                message:
                    "Public faculty registration is disabled. Ask Admin/HR/IQAC to provision your account, then use First Time Faculty Login Setup.",
            },
            { status: 410 }
        );
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
