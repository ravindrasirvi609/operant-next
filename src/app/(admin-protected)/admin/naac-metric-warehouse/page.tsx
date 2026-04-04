import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NaacMetricWarehouseManager } from "@/components/admin/naac-metric-warehouse-manager";
import { requireAdmin } from "@/lib/auth/user";
import { getNaacMetricWarehouseAdminConsole } from "@/lib/naac-metric-warehouse/service";

export default async function AdminNaacMetricWarehousePage() {
    const admin = await requireAdmin();
    const consoleData = await getNaacMetricWarehouseAdminConsole({
        id: admin.id,
        name: admin.name,
        role: admin.role,
    });

    const safeData = JSON.parse(JSON.stringify(consoleData)) as typeof consoleData;

    return (
        <Card>
            <CardHeader>
                <CardTitle>NAAC Metric Data Warehouse</CardTitle>
                <CardDescription>
                    Materialize institution-level NAAC metrics from the live UMS modules, preserve source lineage, and review warehouse values before downstream AQAR and accreditation reporting.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <NaacMetricWarehouseManager
                    definitions={safeData.definitions as never}
                    cycles={safeData.cycles as never}
                    academicYearOptions={safeData.academicYearOptions as never}
                    initialWorkspace={safeData.workspace as never}
                />
            </CardContent>
        </Card>
    );
}
