import { NextResponse } from "next/server";

import { AuthError } from "@/lib/auth/errors";
import { assertLeadershipApiAccess } from "@/lib/auth/user";
import { getLeadershipFacultyRecords } from "@/lib/director/dashboard";

type RouteProps = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
    try {
        const actor = await assertLeadershipApiAccess();
        const { id } = await params;
        const records = await getLeadershipFacultyRecords(
            {
                id: actor.id,
                name: actor.name,
                role: actor.role,
                department: actor.department,
                collegeName: actor.collegeName,
                universityName: actor.universityName,
            },
            id
        );

        return NextResponse.json({ records });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        return NextResponse.json({ message: "Unable to load faculty records." }, { status: 500 });
    }
}
