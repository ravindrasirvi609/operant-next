import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { deletePbasApplication, getPbasApplicationById, updatePbasApplication } from "@/lib/pbas/service";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(_request: Request, context: RouteContext) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const { id } = await context.params;
        const application = await getPbasApplicationById(
            {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department,
            },
            id
        );

        return NextResponse.json({ application });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function DELETE(_request: Request, context: RouteContext) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const { id } = await context.params;
        await deletePbasApplication(
            {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department,
            },
            id
        );

        return NextResponse.json({
            message: "PBAS application deleted successfully.",
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function PUT(request: Request, context: RouteContext) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await request.json();
        const application = await updatePbasApplication(
            {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department,
            },
            id,
            body
        );

        return NextResponse.json({
            message: "PBAS application updated successfully.",
            application,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
