import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { getAqarCycleById, updateAqarCycle } from "@/lib/aqar-cycle/service";

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
        const cycle = await getAqarCycleById({ id: user.id, name: user.name, role: user.role }, id);
        return NextResponse.json({ cycle });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function PATCH(request: Request, context: RouteContext) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await request.json();
        const cycle = await updateAqarCycle({ id: user.id, name: user.name, role: user.role }, id, body);
        return NextResponse.json({ message: "AQAR cycle updated successfully.", cycle });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
