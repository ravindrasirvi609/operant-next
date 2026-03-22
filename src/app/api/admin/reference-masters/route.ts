import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import {
    createReferenceMaster,
    listReferenceMasters,
    referenceMasterKinds,
    type ReferenceMasterKind,
} from "@/lib/admin/reference-masters";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

export async function GET() {
    try {
        await assertAdminApiAccess();
        const data = await listReferenceMasters();
        return NextResponse.json(data);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = (await request.json()) as { kind?: ReferenceMasterKind };
        const kind = body.kind;

        if (!kind || !referenceMasterKinds.includes(kind)) {
            return NextResponse.json({ message: "Unsupported reference master kind." }, { status: 400 });
        }

        const item = await createReferenceMaster(kind, body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });

        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
