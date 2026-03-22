import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { markNotificationRead } from "@/lib/notifications/service";

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
        await markNotificationRead(user.id, id);

        return NextResponse.json({ message: "Notification marked as read." });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
