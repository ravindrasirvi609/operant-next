import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDirector } from "@/lib/auth/user";
import { getLeadershipDashboardData } from "@/lib/director/dashboard";

export default async function DirectorApprovalsPage() {
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
                <Badge>Action queue</Badge>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
                    Pending approvals and final decisions
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-500">
                    This queue shows only workflow items that are currently assigned to your account through active
                    governance mapping. Browsing access and action eligibility stay separate.
                </p>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <MetricCard label="All actionable" value={dashboard.queue.totalActionable} />
                <MetricCard label="Review-stage items" value={dashboard.queue.reviewCount} />
                <MetricCard label="Final approvals" value={dashboard.queue.finalCount} />
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
                <ModuleQueueCard
                    label="PBAS"
                    href="/director/pbas"
                    actionable={dashboard.modules.PBAS.actionable}
                    finalApprovals={dashboard.modules.PBAS.finalApprovals}
                    total={dashboard.modules.PBAS.total}
                />
                <ModuleQueueCard
                    label="CAS"
                    href="/director/cas"
                    actionable={dashboard.modules.CAS.actionable}
                    finalApprovals={dashboard.modules.CAS.finalApprovals}
                    total={dashboard.modules.CAS.total}
                />
                <ModuleQueueCard
                    label="AQAR"
                    href="/director/aqar"
                    actionable={dashboard.modules.AQAR.actionable}
                    finalApprovals={dashboard.modules.AQAR.finalApprovals}
                    total={dashboard.modules.AQAR.total}
                />
            </section>

            <Card>
                <CardHeader>
                    <CardTitle>Current queue items</CardTitle>
                    <CardDescription>
                        The most recent items where your account can currently review, recommend, approve, or reject.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {dashboard.queue.items.length ? (
                        dashboard.queue.items.map((item) => (
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={`${item.moduleName}-${item.id}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                                            {item.moduleName}
                                        </p>
                                        <h3 className="mt-2 text-base font-semibold text-zinc-950">{item.title}</h3>
                                        <p className="mt-1 text-sm text-zinc-500">{item.subtitle}</p>
                                    </div>
                                    <Badge>{item.actionLabel}</Badge>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <p className="text-sm text-zinc-500">Current status: {item.status}</p>
                                    <Button asChild size="sm" variant="secondary">
                                        <Link href={item.href}>Open {item.moduleName}</Link>
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                            Nothing is waiting on your action right now.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: number }) {
    return (
        <Card>
            <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
            </CardContent>
        </Card>
    );
}

function ModuleQueueCard({
    label,
    href,
    actionable,
    finalApprovals,
    total,
}: {
    label: string;
    href: string;
    actionable: number;
    finalApprovals: number;
    total: number;
}) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <CardTitle>{label}</CardTitle>
                    <Badge>{actionable} actionable</Badge>
                </div>
                <CardDescription>
                    {finalApprovals} item(s) are waiting for final approval out of {total} scoped records.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild className="w-full" variant="secondary">
                    <Link href={href}>Open {label}</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
