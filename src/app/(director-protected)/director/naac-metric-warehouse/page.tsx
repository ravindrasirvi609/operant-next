import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireDirector } from "@/lib/auth/user";
import { getNaacMetricWarehouseLeadershipWorkspace } from "@/lib/naac-metric-warehouse/service";

function formatDateTime(value?: string | Date | null) {
    if (!value) {
        return "Not yet";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return String(value);
    }

    return parsed.toLocaleString();
}

function statusBadgeClass(status: string) {
    if (status === "Reviewed") {
        return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
    }

    if (status === "Overridden") {
        return "bg-amber-100 text-amber-800 hover:bg-amber-100";
    }

    if (status === "Generated") {
        return "bg-sky-100 text-sky-700 hover:bg-sky-100";
    }

    return "bg-zinc-100 text-zinc-700 hover:bg-zinc-100";
}

export default async function DirectorNaacMetricWarehousePage() {
    const director = await requireDirector();
    const dashboard = await getNaacMetricWarehouseLeadershipWorkspace({
        id: director.id,
        name: director.name,
        role: director.role,
        department: director.department,
        collegeName: director.collegeName,
        universityName: director.universityName,
    });
    const safeDashboard = JSON.parse(JSON.stringify(dashboard)) as typeof dashboard;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>NAAC Metric Warehouse</CardTitle>
                    <CardDescription>
                        Read-only leadership and IQAC dashboard over the latest generated warehouse cycle. This view combines live institutional metrics with source-fed SSS, AISHE, NIRF, and compliance indicators.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <Badge>{safeDashboard.access.displayRole} workspace</Badge>
                        {safeDashboard.access.roleLabels.map((label) => (
                            <Badge key={label} variant="secondary">
                                {label}
                            </Badge>
                        ))}
                    </div>

                    {!safeDashboard.workspace ? (
                        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                            No generated NAAC warehouse cycle is available yet. Ask an admin to create and generate a warehouse cycle first.
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-4">
                                <MetricCard
                                    label="Academic year"
                                    value={safeDashboard.workspace.cycle.academicYearLabel}
                                />
                                <MetricCard
                                    label="Generated metrics"
                                    value={String(safeDashboard.workspace.summary.generatedCount)}
                                />
                                <MetricCard
                                    label="Reviewed metrics"
                                    value={String(
                                        safeDashboard.workspace.summary.reviewedCount +
                                            safeDashboard.workspace.summary.overriddenCount
                                    )}
                                />
                                <MetricCard
                                    label="Last sync"
                                    value={safeDashboard.workspace.latestSync?.status ?? "No sync run"}
                                />
                            </div>

                            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Cycle summary</CardTitle>
                                        <CardDescription>
                                            Latest generated warehouse cycle details and review progress by criterion.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-zinc-900">
                                                        {safeDashboard.workspace.cycle.title}
                                                    </p>
                                                    <p className="text-sm text-zinc-500">
                                                        Status: {safeDashboard.workspace.cycle.status}
                                                    </p>
                                                </div>
                                                <Badge className={statusBadgeClass(safeDashboard.workspace.cycle.status)}>
                                                    {safeDashboard.workspace.cycle.status}
                                                </Badge>
                                            </div>
                                            <p className="mt-3 text-sm text-zinc-500">
                                                Last generated: {formatDateTime(safeDashboard.workspace.cycle.lastGeneratedAt)}
                                            </p>
                                            <p className="text-sm text-zinc-500">
                                                Latest sync: {formatDateTime(safeDashboard.workspace.latestSync?.completedAt)}
                                            </p>
                                        </div>

                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Criterion</TableHead>
                                                    <TableHead>Total</TableHead>
                                                    <TableHead>Reviewed</TableHead>
                                                    <TableHead>Overridden</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {safeDashboard.workspace.summary.criteria.map((criterion) => (
                                                    <TableRow key={criterion.criteriaCode}>
                                                        <TableCell>
                                                            <div className="font-medium text-zinc-900">
                                                                {criterion.criteriaCode}
                                                            </div>
                                                            <div className="text-xs text-zinc-500">
                                                                {criterion.criteriaName}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{criterion.totalMetrics}</TableCell>
                                                        <TableCell>{criterion.reviewedCount}</TableCell>
                                                        <TableCell>{criterion.overriddenCount}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Published metric values</CardTitle>
                                        <CardDescription>
                                            Warehouse metrics currently visible to leadership. Source modules are tagged for traceability.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Metric</TableHead>
                                                    <TableHead>Mode</TableHead>
                                                    <TableHead>Value</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {safeDashboard.workspace.values.map((value) => (
                                                    <TableRow key={String(value._id)}>
                                                        <TableCell>
                                                            <div className="font-medium text-zinc-900">{value.label}</div>
                                                            <div className="text-xs text-zinc-500">
                                                                {value.criteriaCode} · {value.metricCode}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>{value.sourceMode}</div>
                                                            {value.moduleKey ? (
                                                                <div className="text-xs text-zinc-500">{value.moduleKey}</div>
                                                            ) : null}
                                                        </TableCell>
                                                        <TableCell>{value.effectiveValueText || "-"}</TableCell>
                                                        <TableCell>
                                                            <Badge className={statusBadgeClass(value.status)}>
                                                                {value.status}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-lg">{value}</CardTitle>
            </CardHeader>
        </Card>
    );
}
