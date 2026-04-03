import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";
import { createStudentSupportGovernancePlan } from "@/lib/student-support-governance/service";

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const plan = await createStudentSupportGovernancePlan(
            {
                id: admin.id,
                name: admin.name,
                role: admin.role,
                department: admin.department,
                collegeName: admin.collegeName,
                universityName: admin.universityName,
                auditContext: getRequestAuditContext(request),
            },
            body
        );

        return NextResponse.json({
            message: "Student support & governance plan created successfully.",
            plan: JSON.parse(JSON.stringify(plan)),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
