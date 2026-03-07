import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthError } from "@/lib/auth/errors";

export function createApiErrorResponse(error: unknown) {
    if (error instanceof ZodError) {
        return NextResponse.json(
            {
                message: error.issues[0]?.message ?? "Validation failed.",
                issues: error.issues,
            },
            { status: 400 }
        );
    }

    if (error instanceof AuthError) {
        return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error(error);

    return NextResponse.json(
        { message: "Something went wrong while processing authentication." },
        { status: 500 }
    );
}
