import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminOrLeadershipApiAccess } from "@/lib/auth/user";
import { reviewAcademicRecordEditRequest } from "@/lib/student/academic-record-requests";

type RouteProps = {
    params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
    try {
        const actor = await assertAdminOrLeadershipApiAccess();
        const { id } = await params;
        const body = (await request.json()) as {
            decision?: "Approve" | "Reject";
            remarks?: string;
        };

        if (body.decision !== "Approve" && body.decision !== "Reject") {
            return NextResponse.json(
                { message: "decision must be 'Approve' or 'Reject'." },
                { status: 400 }
            );
        }

        const reviewed = await reviewAcademicRecordEditRequest(
            { id: actor.id, name: actor.name, role: actor.role },
            id,
            body.decision,
            body.remarks,
            { auditContext: getRequestAuditContext(request) }
        );

        return NextResponse.json({
            message: `Request ${body.decision === "Approve" ? "approved" : "rejected"}.`,
            request: JSON.parse(JSON.stringify(reviewed)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
