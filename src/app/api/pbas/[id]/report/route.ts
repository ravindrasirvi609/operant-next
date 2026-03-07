import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { getPbasApplicationById } from "@/lib/pbas/service";
import { buildPbasReportPdf } from "@/lib/pbas/report-pdf";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
        }

        const { id } = await context.params;
        const application = await getPbasApplicationById(
            {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department,
            },
            id
        );

        const pdf = await buildPbasReportPdf(application);

        return new Response(pdf, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="pbas-${application.academicYear.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
            },
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
