import { NextResponse } from "next/server";

import { AuthError } from "@/lib/auth/errors";
import { assertLeadershipApiAccess } from "@/lib/auth/user";
import { getAccreditationLeadershipCsvExport } from "@/lib/accreditation/service";
import { getLeadershipCsvExport } from "@/lib/director/dashboard";

function toCsv(rows: string[][]) {
    return rows
        .map((row) =>
            row
                .map((value) => `"${String(value ?? "").replaceAll(`"`, `""`)}"`)
                .join(",")
        )
        .join("\n");
}

export async function GET(request: Request) {
    try {
        const actor = await assertLeadershipApiAccess();
        const url = new URL(request.url);
        const type = url.searchParams.get("type");

        if (
            type !== "faculty-roster" &&
            type !== "department-summary" &&
            type !== "accreditation-sss" &&
            type !== "accreditation-aishe" &&
            type !== "accreditation-nirf" &&
            type !== "accreditation-compliance"
        ) {
            return NextResponse.json(
                { message: "Unknown report type." },
                { status: 400 }
            );
        }

        const exportActor = {
            id: actor.id,
            name: actor.name,
            role: actor.role,
            department: actor.department,
            collegeName: actor.collegeName,
            universityName: actor.universityName,
        };
        const exportData =
            type === "faculty-roster" || type === "department-summary"
                ? await getLeadershipCsvExport(exportActor, type)
                : await getAccreditationLeadershipCsvExport(exportActor, type);

        return new NextResponse(toCsv(exportData.rows), {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${exportData.fileName}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        return NextResponse.json({ message: "Unable to export leadership report." }, { status: 500 });
    }
}
