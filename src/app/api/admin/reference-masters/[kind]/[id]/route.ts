import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import {
    referenceMasterKinds,
    updateReferenceMasterStatus,
    type ReferenceMasterKind,
} from "@/lib/admin/reference-masters";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

type RouteProps = {
    params: Promise<{
        kind: string;
        id: string;
    }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
    try {
        const admin = await assertAdminApiAccess();
        const { kind, id } = await params;

        if (!referenceMasterKinds.includes(kind as ReferenceMasterKind)) {
            return NextResponse.json({ message: "Unsupported reference master kind." }, { status: 400 });
        }

        const body = await request.json();
        const item = await updateReferenceMasterStatus(kind as ReferenceMasterKind, id, body, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });

        return NextResponse.json(item);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
