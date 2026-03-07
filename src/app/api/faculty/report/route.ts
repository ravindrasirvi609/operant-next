import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/user";
import { getFacultyWorkspace } from "@/lib/faculty/service";
import { buildFacultyReportPdf } from "@/lib/faculty/report-pdf";
import { createApiErrorResponse } from "@/lib/auth/http";

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();

        if (!user || user.role !== "Faculty") {
            return NextResponse.json({ message: "Faculty access required." }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");
        const entryId = searchParams.get("entryId");

        if ((type !== "cas" && type !== "pbas") || !entryId) {
            return NextResponse.json({ message: "Valid report type and entryId are required." }, { status: 400 });
        }

        const workspace = await getFacultyWorkspace(user.id);
        const pdf = buildFacultyReportPdf(workspace, type, entryId);

        return new Response(pdf, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${workspace.user.name.replace(/\s+/g, "-").toLowerCase()}-${type}-report.pdf"`,
            },
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
