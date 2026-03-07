import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { generateAqarCycleSnapshot } from "@/lib/aqar-cycle/service";

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
        const cycle = await generateAqarCycleSnapshot({ id: user.id, name: user.name, role: user.role }, id);
        return NextResponse.json({ message: "AQAR snapshot generated successfully.", cycle });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
