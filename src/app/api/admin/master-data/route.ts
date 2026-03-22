import { NextResponse } from "next/server";

import { getRequestAuditContext } from "@/lib/audit/request";
import {
    createMasterDataEntry,
    getMasterDataMap,
    masterDataCategoryIds,
} from "@/lib/admin/master-data";
import { createApiErrorResponse } from "@/lib/auth/http";
import { assertAdminApiAccess } from "@/lib/auth/user";

export async function GET(request: Request) {
    try {
        await assertAdminApiAccess();
        const { searchParams } = new URL(request.url);
        const categoriesParam = searchParams.get("categories");
        const categories = categoriesParam
            ? categoriesParam.split(",").map((item) => item.trim())
            : masterDataCategoryIds;

        const data = await getMasterDataMap(categories);

        return NextResponse.json(data);
    } catch (error) {
        return createApiErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const admin = await assertAdminApiAccess();
        const body = await request.json();
        const item = await createMasterDataEntry(body, admin.id, {
            actor: { id: admin.id, name: admin.name, role: admin.role },
            auditContext: getRequestAuditContext(request),
        });

        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        return createApiErrorResponse(error);
    }
}
