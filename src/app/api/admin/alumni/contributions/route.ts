import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createAlumniContribution, listAlumniContributions } from "@/lib/alumni/service";

export async function GET(request: Request) {
    try {
        await assertAdminApiAccess();
        const associationId = new URL(request.url).searchParams.get("associationId") ?? undefined;

        const contributions = await listAlumniContributions(associationId);
        return NextResponse.json({ contributions });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const actor = await assertAdminApiAccess();
        const body = await request.json();

        const contribution = await createAlumniContribution(
            { id: actor.id, name: actor.name, role: actor.role },
            body
        );

        return NextResponse.json({ message: "Contribution recorded.", contribution });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
