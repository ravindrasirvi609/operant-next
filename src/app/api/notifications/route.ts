import { NextResponse } from "next/server";

import { ensureAqarReminderForFaculty } from "@/lib/aqar/service";
import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { ensureCasEligibilityReminderForFaculty } from "@/lib/cas/service";
import { getNotificationSummary } from "@/lib/notifications/service";
import { ensurePbasDeadlineReminderForFaculty } from "@/lib/pbas/service";

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limitParam = Number(searchParams.get("limit") ?? 12);
        const limit = Number.isFinite(limitParam) ? limitParam : 12;

        const actor = {
            id: user.id,
            name: user.name,
            role: user.role,
            department: user.department,
        };

        await Promise.all([
            ensurePbasDeadlineReminderForFaculty(actor),
            ensureCasEligibilityReminderForFaculty(actor),
            ensureAqarReminderForFaculty(actor),
        ]);

        const summary = await getNotificationSummary(user.id, { limit });

        return NextResponse.json(summary);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
