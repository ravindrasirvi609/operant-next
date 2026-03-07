import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDirectorDashboardData } from "@/lib/director/dashboard";
import { requireDirector } from "@/lib/auth/user";

export default async function DirectorDashboardPage() {
    const director = await requireDirector();
    const dashboard = await getDirectorDashboardData(director.id);

    return (
        <div className="space-y-6">
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <Badge>Director Dashboard</Badge>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
                    Organization leadership overview
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-500">
                    This portal reflects the colleges and departments where you are assigned as the institutional head or director.
                </p>
            </section>

            <section className="grid gap-4 md:grid-cols-4">
                <MetricCard label="Managed units" value={dashboard.managedOrganizations.length} />
                <MetricCard label="Child units" value={dashboard.childOrganizations.length} />
                <MetricCard label="Faculty" value={dashboard.metrics.facultyCount} />
                <MetricCard label="Students" value={dashboard.metrics.studentCount} />
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Assigned leadership units</CardTitle>
                        <CardDescription>
                            Units directly mapped to your director/head account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {dashboard.managedOrganizations.length ? (
                            dashboard.managedOrganizations.map((item) => (
                                <div
                                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                    key={item._id.toString()}
                                >
                                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                                        {item.type}
                                    </p>
                                    <h3 className="mt-2 text-lg font-semibold text-zinc-950">
                                        {item.name}
                                    </h3>
                                    <p className="mt-2 text-sm text-zinc-500">
                                        {item.universityName || "No university"} / {item.collegeName || "No college"}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-500">
                                        Title: {item.headTitle || "Director"}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                No hierarchy assignment has been mapped to this director account yet.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Subordinate structure</CardTitle>
                        <CardDescription>
                            Colleges, departments, centers, and offices falling under your current assignments.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {dashboard.childOrganizations.length ? (
                            dashboard.childOrganizations.map((item) => (
                                <div
                                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                    key={item._id.toString()}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                                                Level {item.hierarchyLevel} • {item.type}
                                            </p>
                                            <h3 className="mt-2 text-lg font-semibold text-zinc-950">
                                                {item.name}
                                            </h3>
                                        </div>
                                        <Badge>{item.headName || "Unassigned"}</Badge>
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-500">
                                        Parent: {item.parentOrganizationName || "Root"}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                No subordinate units are attached yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: number }) {
    return (
        <Card>
            <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                    {label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
            </CardContent>
        </Card>
    );
}
