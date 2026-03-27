import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireDirector } from "@/lib/auth/user";
import { getLeadershipDashboardData } from "@/lib/director/dashboard";

export default async function DirectorReportsPage() {
    const director = await requireDirector();
    const dashboard = await getLeadershipDashboardData({
        id: director.id,
        name: director.name,
        role: director.role,
        department: director.department,
        collegeName: director.collegeName,
        universityName: director.universityName,
    });

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <Badge>Leadership reports</Badge>
                        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
                            Scoped operational reporting
                        </h1>
                        <p className="mt-4 text-base leading-8 text-zinc-500">
                            Export department and faculty summaries that reflect the same governance scope enforced by
                            the leadership portal and workflow engine.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button asChild>
                            <Link href="/api/director/reports?type=faculty-roster">Export faculty CSV</Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href="/api/director/reports?type=department-summary">Export department CSV</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Module summary</CardTitle>
                        <CardDescription>
                            Record distribution by module inside your authorized scope.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Module</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Actionable</TableHead>
                                    <TableHead>Approved</TableHead>
                                    <TableHead>Rejected</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(["PBAS", "CAS", "AQAR"] as const).map((moduleName) => (
                                    <TableRow key={moduleName}>
                                        <TableCell className="font-medium">{moduleName}</TableCell>
                                        <TableCell>{dashboard.modules[moduleName].total}</TableCell>
                                        <TableCell>{dashboard.modules[moduleName].actionable}</TableCell>
                                        <TableCell>{dashboard.modules[moduleName].approved}</TableCell>
                                        <TableCell>{dashboard.modules[moduleName].rejected}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Governance coverage</CardTitle>
                        <CardDescription>
                            Current assignment, committee, and evidence workload summary.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                        <Metric label="Assignments" value={dashboard.metrics.activeAssignments} />
                        <Metric label="Committees" value={dashboard.metrics.activeCommittees} />
                        <Metric label="Departments" value={dashboard.metrics.departmentCount} />
                        <Metric label="Evidence pending" value={dashboard.metrics.evidencePending} />
                    </CardContent>
                </Card>
            </section>

            <Card>
                <CardHeader>
                    <CardTitle>Department summary</CardTitle>
                    <CardDescription>
                        Pending operational load by department, including evidence verification backlog.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Department</TableHead>
                                <TableHead>Faculty</TableHead>
                                <TableHead>PBAS Pending</TableHead>
                                <TableHead>CAS Pending</TableHead>
                                <TableHead>AQAR Pending</TableHead>
                                <TableHead>Evidence Pending</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dashboard.departmentBreakdown.map((row) => (
                                <TableRow key={row.departmentId}>
                                    <TableCell className="font-medium">{row.departmentName}</TableCell>
                                    <TableCell>{row.facultyCount}</TableCell>
                                    <TableCell>{row.pbasPending}</TableCell>
                                    <TableCell>{row.casPending}</TableCell>
                                    <TableCell>{row.aqarPending}</TableCell>
                                    <TableCell>{row.evidencePending}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
        </div>
    );
}
