import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { finalizeAqarCycle } from "@/lib/aqar-cycle/service";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const { id } = await context.params;
        const cycle = await finalizeAqarCycle({ id: user.id, name: user.name, role: user.role }, id);
        return NextResponse.json({ message: "AQAR cycle finalized successfully.", cycle });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
