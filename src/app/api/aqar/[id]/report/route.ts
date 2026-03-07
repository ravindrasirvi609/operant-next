import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { getAqarApplicationById } from "@/lib/aqar/service";
import { buildAqarReportPdf } from "@/lib/aqar/report-pdf";

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
        const application = await getAqarApplicationById(
            {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department,
            },
            id
        );

        const pdf = await buildAqarReportPdf(application);

        return new Response(pdf, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="aqar-${application.academicYear.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
            },
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
