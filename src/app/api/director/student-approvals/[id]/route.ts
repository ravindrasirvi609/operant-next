import { NextResponse } from "next/server";

import { AuthError } from "@/lib/auth/errors";
import { assertLeadershipApiAccess } from "@/lib/auth/user";

type RouteProps = {
    params: Promise<{
        id: string;
    }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
    try {
        await assertLeadershipApiAccess();
        await request.json();
        await params;

        return NextResponse.json(
            {
                message:
                    "Student approval actions are retired. Student identities are provisioned centrally and no leadership approval is required in this flow.",
            },
            { status: 410 }
        );
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        return NextResponse.json({ message: "Unable to process this request." }, { status: 500 });
    }
}
