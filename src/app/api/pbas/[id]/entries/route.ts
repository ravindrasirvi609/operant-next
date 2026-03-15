import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { getPbasEntriesForForm, upsertPbasEntryForForm } from "@/lib/pbas/service";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const { id } = await context.params;
        const entries = await getPbasEntriesForForm(
            { id: user.id, name: user.name, role: user.role, department: user.department },
            id
        );

        return NextResponse.json({ entries });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request, context: RouteContext) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const body = await request.json();
        const { id } = await context.params;

        const entries = await upsertPbasEntryForForm(
            { id: user.id, name: user.name, role: user.role, department: user.department },
            id,
            body
        );

        return NextResponse.json({ entries });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

