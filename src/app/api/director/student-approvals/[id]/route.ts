import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/user";

type RouteProps = {
    params: Promise<{
        id: string;
    }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
    const user = await getCurrentUser();

    if (!user || user.role !== "Director") {
        return NextResponse.json({ message: "Director access required." }, { status: 403 });
    }

    await request.json();
    await params;

    return NextResponse.json(
        {
            message:
                "Student approval actions are no longer used. Student accounts are provisioned by admin and activated directly by students.",
        },
        { status: 410 }
    );
}
