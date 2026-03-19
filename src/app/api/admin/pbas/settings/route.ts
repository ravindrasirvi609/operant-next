import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess, getCurrentUser } from "@/lib/auth/user";
import { getPbasScoringSettings, updatePbasScoringSettings } from "@/lib/pbas/admin";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const settings = await getPbasScoringSettings();
        return NextResponse.json({ settings });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function PATCH(request: Request) {
    try {
        await assertAdminApiAccess();
        const user = await getCurrentUser();
        const body = await request.json();
        const settings = await updatePbasScoringSettings(body, user?.id);
        return NextResponse.json({
            message: "PBAS settings updated successfully.",
            settings,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
