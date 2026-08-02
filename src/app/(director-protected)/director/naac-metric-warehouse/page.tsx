import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
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
                        <EmptyState
                            title="No warehouse cycle"
                            description="No generated NAAC warehouse cycle is available yet. Ask an admin to create and generate a warehouse cycle first."
                        />
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
                                        <div className="rounded-xl border border-border bg-muted/50 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {safeDashboard.workspace.cycle.title}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Status: {safeDashboard.workspace.cycle.status}
                                                    </p>
                                                </div>
                                                <StatusBadge status={safeDashboard.workspace.cycle.status} />
                                            </div>
                                            <p className="mt-3 text-sm text-muted-foreground">
                                                Last generated: {formatDateTime(safeDashboard.workspace.cycle.lastGeneratedAt)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
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
                                                            <div className="font-medium text-foreground">
                                                                {criterion.criteriaCode}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
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
                                                            <div className="font-medium text-foreground">{value.label}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {value.criteriaCode} · {value.metricCode}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>{value.sourceMode}</div>
                                                            {value.moduleKey ? (
                                                                <div className="text-xs text-muted-foreground">{value.moduleKey}</div>
                                                            ) : null}
                                                        </TableCell>
                                                        <TableCell>{value.effectiveValueText || "-"}</TableCell>
                                                        <TableCell>
                                                            <StatusBadge status={value.status} />
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
    return <StatCard label={label} value={value} />;
}
