import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthError } from "@/lib/auth/errors";

type MongooseLikeError = {
    name?: string;
    message?: string;
    path?: string;
    errors?: Record<string, { message?: string; path?: string; name?: string }>;
};

function isMongooseValidationError(error: unknown): error is MongooseLikeError {
    return (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as MongooseLikeError).name === "ValidationError"
    );
}

function isMongooseCastError(error: unknown): error is MongooseLikeError {
    return (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as MongooseLikeError).name === "CastError"
    );
}

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

    if (isMongooseValidationError(error)) {
        const issues = Object.entries(error.errors ?? {}).map(([key, value]) => ({
            path: value.path ?? key,
            message: value.message ?? "Invalid value.",
            code: value.name ?? "ValidationError",
        }));

        return NextResponse.json(
            {
                message: issues[0]?.message ?? error.message ?? "Validation failed.",
                issues,
            },
            { status: 400 }
        );
    }

    if (isMongooseCastError(error)) {
        return NextResponse.json(
            {
                message: error.message ?? "Invalid value supplied.",
                issues: [
                    {
                        path: error.path ?? "unknown",
                        message: error.message ?? "Invalid value supplied.",
                        code: "CastError",
                    },
                ],
            },
            { status: 400 }
        );
    }

    if (error instanceof AuthError) {
        return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error(error);

    return NextResponse.json(
        { message: "Request failed due to an unexpected server error." },
        { status: 500 }
    );
}
