import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { listReportTemplates } from "@/lib/report-templates/service";

export async function GET() {
    try {
        await assertAdminApiAccess();

        const templates = await listReportTemplates();

        return NextResponse.json({
            templates: JSON.parse(JSON.stringify(templates)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
