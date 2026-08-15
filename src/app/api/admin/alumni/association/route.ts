import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { getAlumniAssociation, upsertAlumniAssociation } from "@/lib/alumni/service";

export async function GET(request: Request) {
    try {
        await assertAdminApiAccess();
        const institutionId = new URL(request.url).searchParams.get("institutionId");
        if (!institutionId) {
            return NextResponse.json({ message: "institutionId query parameter is required." }, { status: 400 });
        }

        const association = await getAlumniAssociation(institutionId);
        return NextResponse.json({ association });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function PUT(request: Request) {
    try {
        const actor = await assertAdminApiAccess();
        const body = await request.json();

        const association = await upsertAlumniAssociation(
            { id: actor.id, name: actor.name, role: actor.role },
            body
        );

        return NextResponse.json({ message: "Alumni association saved.", association });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
