import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { buildAqarCyclePdf } from "@/lib/aqar-cycle/report-pdf";
import { getAqarCycleById } from "@/lib/aqar-cycle/service";

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
        const cycle = await getAqarCycleById({ id: user.id, name: user.name, role: user.role }, id);
        const pdf = await buildAqarCyclePdf(cycle);

        return new Response(pdf, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="institutional-aqar-${cycle.academicYear.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
            },
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
