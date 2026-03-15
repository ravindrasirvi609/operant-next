import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { updateEvidenceVerification } from "@/lib/evidence/service";

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: "Authentication required." }, { status: 401 });
        }

        const body = (await request.json()) as {
            status?: "Verified" | "Rejected";
            remarks?: string;
        };

        if (!body.status) {
            return NextResponse.json({ message: "Status is required." }, { status: 400 });
        }

        const document = await updateEvidenceVerification(
            { id: user.id, name: user.name, role: user.role },
            params.id,
            body.status,
            body.remarks
        );

        return NextResponse.json({ document });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
