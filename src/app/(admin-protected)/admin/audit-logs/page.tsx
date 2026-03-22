import { AuditLogManager } from "@/components/admin/audit-log-manager";
import { requireAdmin } from "@/lib/auth/user";
import { listAuditLogs } from "@/lib/audit/service";

export default async function AdminAuditLogsPage() {
    await requireAdmin();
    const auditData = await listAuditLogs();

    return (
        <div className="space-y-6">
            <AuditLogManager initialData={JSON.parse(JSON.stringify(auditData))} />
        </div>
    );
}
