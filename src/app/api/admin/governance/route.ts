import { NextResponse } from "next/server";

import { getGovernanceData } from "@/lib/governance/service";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const data = await getGovernanceData();

        return NextResponse.json(data);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
