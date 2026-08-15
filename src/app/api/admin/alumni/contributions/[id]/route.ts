import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { deleteAlumniContribution } from "@/lib/alumni/service";

type RouteProps = {
    params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: RouteProps) {
    try {
        const actor = await assertAdminApiAccess();
        const { id } = await params;

        const result = await deleteAlumniContribution(
            { id: actor.id, name: actor.name, role: actor.role },
            id
        );

        return NextResponse.json(result);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
