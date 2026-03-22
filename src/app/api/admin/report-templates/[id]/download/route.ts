import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { buildReportTemplatePreviewPdf } from "@/lib/report-templates/preview";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
    try {
        await assertAdminApiAccess();

        const { id } = await context.params;
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get("mode") === "live" ? "live" : "sample";
        const recordId = searchParams.get("recordId") ?? undefined;
        const pdf = await buildReportTemplatePreviewPdf(id, mode, recordId);

        return new Response(pdf, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="report-template-${mode}-${id}.pdf"`,
            },
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
