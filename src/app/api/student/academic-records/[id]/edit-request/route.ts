import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { createAcademicRecordEditRequest } from "@/lib/student/academic-record-requests";

type RouteProps = {
    params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "Student") {
            return NextResponse.json(
                { message: "Student access required." },
                { status: 403 }
            );
        }

        const { id } = await params;
        const body = await request.json();

        const editRequest = await createAcademicRecordEditRequest(user.id, id, body, {
            actor: { id: user.id, name: user.name, role: user.role },
            auditContext: getRequestAuditContext(request),
        });

        return NextResponse.json({
            message: "Correction request submitted for review.",
            request: JSON.parse(JSON.stringify(editRequest)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
