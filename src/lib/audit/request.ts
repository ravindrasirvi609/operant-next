import type { AuditRequestContext } from "@/lib/audit/service";

function normalizeIpAddress(value: string | null) {
    if (!value) {
        return undefined;
    }

    const first = value.split(",")[0]?.trim();
    return first || undefined;
}

export function getRequestAuditContext(request: Request): AuditRequestContext {
    return {
        ipAddress:
            normalizeIpAddress(request.headers.get("x-forwarded-for")) ??
            normalizeIpAddress(request.headers.get("x-real-ip")) ??
            normalizeIpAddress(request.headers.get("cf-connecting-ip")),
    };
}
