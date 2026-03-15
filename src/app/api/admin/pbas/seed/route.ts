import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { seedPbasMasters } from "@/lib/pbas/migration";

export async function POST(request: Request) {
    try {
        await assertAdminApiAccess();
        const body = await request.json().catch(() => ({}));
        const overwrite = Boolean(body?.overwrite);
        await seedPbasMasters({ overwrite });
        return NextResponse.json({ message: "PBAS master catalog seeded successfully." });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
