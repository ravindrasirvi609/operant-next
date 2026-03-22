import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { getReportTemplatePreviewOptions } from "@/lib/report-templates/preview";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
    try {
        await assertAdminApiAccess();

        const { id } = await context.params;
        const preview = await getReportTemplatePreviewOptions(id);

        return NextResponse.json(preview);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
