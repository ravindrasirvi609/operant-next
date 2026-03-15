import { NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/user";
import { getStudentMasterData } from "@/lib/student/master-data";

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "Student") {
            return NextResponse.json(
                { message: "Student access required." },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const typesParam = searchParams.get("types");
        const types = typesParam
            ? typesParam.split(",").map((value) => value.trim()).filter(Boolean)
            : [];

        const data = await getStudentMasterData(
            types as Array<
                "awards" | "skills" | "sports" | "events" | "cultural" | "social"
            >
        );

        return NextResponse.json(data);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
