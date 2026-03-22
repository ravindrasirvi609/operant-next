import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { markAllNotificationsRead } from "@/lib/notifications/service";

export async function POST() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        await markAllNotificationsRead(user.id);

        return NextResponse.json({ message: "All notifications marked as read." });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
