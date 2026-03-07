import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { decideStudentApproval } from "@/lib/student/service";

type RouteProps = {
    params: Promise<{
        id: string;
    }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
    try {
        const user = await getCurrentUser();

        if (!user || user.role !== "Director") {
            return NextResponse.json({ message: "Director access required." }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const result = await decideStudentApproval(user.id, id, body);

        return NextResponse.json({
            message:
                body.decision === "approve"
                    ? "Student profile approved and login activated."
                    : "Student profile sent back for revision.",
            studentDetails: result.studentDetails,
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
