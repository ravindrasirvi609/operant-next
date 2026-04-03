import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDirector } from "@/lib/auth/user";
import { getLeadershipDashboardData } from "@/lib/director/dashboard";

export default async function DirectorDashboardPage() {
    const director = await requireDirector();
    const dashboard = await getLeadershipDashboardData({
        id: director.id,
        name: director.name,
        role: director.role,
        department: director.department,
        collegeName: director.collegeName,
        universityName: director.universityName,
    });

    const facultyAttention = dashboard.facultyRoster.filter((row) => row.needsAttention).slice(0, 8);

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <Badge>{dashboard.access.displayRole} workspace</Badge>
                        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
                            Leadership operations overview
                        </h1>
                        <p className="mt-4 text-base leading-8 text-zinc-500">
                            This workspace is scoped to your active governance assignments and committee memberships.
                            You can browse only authorized records, and action controls appear only when a workflow is
                            currently assigned to you.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {dashboard.access.roleLabels.map((label) => (
                                <Badge key={label} variant="secondary">
                                    {label}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button asChild>
                            <Link href="/director/approvals">Open action queue</Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href="/director/faculty">View faculty roster</Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href="/director/reports">Open reports</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <MetricCard label="Faculty in scope" value={dashboard.metrics.facultyCount} />
                <MetricCard label="Departments in scope" value={dashboard.metrics.departmentCount} />
                <MetricCard label="Actionable items" value={dashboard.metrics.actionableItems} />
                <MetricCard label="Active assignments" value={dashboard.metrics.activeAssignments} />
                <MetricCard label="Active committees" value={dashboard.metrics.activeCommittees} />
                <MetricCard label="Evidence pending" value={dashboard.metrics.evidencePending} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Action queue</CardTitle>
                        <CardDescription>
                            The most recent PBAS, CAS, AQAR, SSR, curriculum, teaching-learning, infrastructure, and research-innovation items currently waiting for your review or final approval.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {dashboard.queue.items.length ? (
                            dashboard.queue.items.map((item) => (
                                <div
                                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                    key={`${item.moduleName}-${item.id}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                                                {item.moduleName}
                                            </p>
                                            <h3 className="mt-2 text-base font-semibold text-zinc-950">
                                                {item.title}
                                            </h3>
                                            <p className="mt-1 text-sm text-zinc-500">{item.subtitle}</p>
                                        </div>
                                        <Badge>{item.actionLabel}</Badge>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-zinc-500">
                                        <span>Status: {item.status}</span>
                                        <Link className="font-medium text-zinc-900 underline" href={item.href}>
                                            Open module
                                        </Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                No workflow items are currently assigned to your account.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Governance scope</CardTitle>
                        <CardDescription>
                            Your current organizational reach across assignments, committees, and inherited scope.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {dashboard.scopes.length ? (
                            dashboard.scopes.map((scope, index) => (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={`${scope.label}-${index}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-base font-semibold text-zinc-950">{scope.label}</h3>
                                        <Badge variant="secondary">{scope.scopeType}</Badge>
                                    </div>
                                    {scope.organizationName ? (
                                        <p className="mt-2 text-sm text-zinc-500">{scope.organizationName}</p>
                                    ) : null}
                                </div>
                            ))
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                No active governance scope is mapped to this account yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-8">
                <ModuleCard
                    href="/director/pbas"
                    label="PBAS"
                    summary={dashboard.modules.PBAS}
                    description="Academic performance and indicator moderation for faculty in scope."
                />
                <ModuleCard
                    href="/director/cas"
                    label="CAS"
                    summary={dashboard.modules.CAS}
                    description="Career advancement applications awaiting review or final decision."
                />
                <ModuleCard
                    href="/director/aqar"
                    label="AQAR"
                    summary={dashboard.modules.AQAR}
                    description="AQAR faculty contributions and quality review checkpoints."
                />
                <ModuleCard
                    href="/director/ssr"
                    label="SSR"
                    summary={dashboard.modules.SSR}
                    description="Self-study report submissions, evidence, and committee workflows in your scope."
                />
                <ModuleCard
                    href="/director/curriculum"
                    label="Curriculum"
                    summary={dashboard.modules.CURRICULUM}
                    description="Versioned curriculum drafts, BoS governance review, and syllabus approvals in your scope."
                />
                <ModuleCard
                    href="/director/teaching-learning"
                    label="Teaching Learning"
                    summary={dashboard.modules.TEACHING_LEARNING}
                    description="Course-delivery files, learner support actions, and evidence-backed teaching process reviews in your scope."
                />
                <ModuleCard
                    href="/director/infrastructure-library"
                    label="Infrastructure"
                    summary={dashboard.modules.INFRASTRUCTURE_LIBRARY}
                    description="Facilities, library resources, usage analytics, and maintenance-backed infrastructure reviews in your scope."
                />
                <ModuleCard
                    href="/director/student-support-governance"
                    label="Student Support"
                    summary={dashboard.modules.STUDENT_SUPPORT_GOVERNANCE}
                    description="Mentoring, grievance redressal, progression, and student-representation reviews in your governance scope."
                />
                <ModuleCard
                    href="/director/research-innovation"
                    label="Research"
                    summary={dashboard.modules.RESEARCH_INNOVATION}
                    description="Research portfolio files, innovation ecosystem evidence, and committee-led scrutiny within your scope."
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Department backlog</CardTitle>
                        <CardDescription>
                            Department-level pending load across approvals and student evidence verification.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {dashboard.departmentBreakdown.length ? (
                            dashboard.departmentBreakdown.slice(0, 8).map((row) => (
                                <div
                                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                    key={row.departmentId}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-base font-semibold text-zinc-950">{row.departmentName}</h3>
                                        <Badge variant="secondary">{row.facultyCount} faculty</Badge>
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-500">
                                        PBAS {row.pbasPending} • CAS {row.casPending} • AQAR {row.aqarPending} • Evidence {row.evidencePending}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                No departments were resolved from your current governance scope.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Faculty needing attention</CardTitle>
                        <CardDescription>
                            Faculty records with active PBAS, CAS, or AQAR workflow movement inside your scope.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {facultyAttention.length ? (
                            facultyAttention.map((row) => (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={row.facultyId}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-base font-semibold text-zinc-950">{row.facultyName}</h3>
                                            <p className="text-sm text-zinc-500">
                                                {row.departmentName ?? "Department not mapped"} • {row.designation}
                                            </p>
                                        </div>
                                        <Badge className="bg-amber-100 text-amber-800">Needs attention</Badge>
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-500">
                                        PBAS {row.pbasStatus ?? "No record"} • CAS {row.casStatus ?? "No record"} • AQAR {row.aqarStatus ?? "No record"}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                                No faculty members currently need workflow attention in your scope.
                            </div>
                        )}
                        <Button asChild className="w-full" variant="secondary">
                            <Link href="/director/faculty">Open full faculty roster</Link>
                        </Button>
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

function ModuleCard({
    href,
    label,
    summary,
    description,
}: {
    href: string;
    label: string;
    summary: {
        total: number;
        actionable: number;
        finalApprovals: number;
        approved: number;
        rejected: number;
        draft: number;
    };
    description: string;
}) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <CardTitle>{label}</CardTitle>
                    <Badge>{summary.actionable} actionable</Badge>
                </div>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    <MiniMetric label="Total" value={summary.total} />
                    <MiniMetric label="Final approvals" value={summary.finalApprovals} />
                    <MiniMetric label="Approved" value={summary.approved} />
                    <MiniMetric label="Rejected" value={summary.rejected} />
                </div>
                <Button asChild className="w-full" variant="secondary">
                    <Link href={href}>Open {label}</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            <p className="mt-2 text-xl font-semibold text-zinc-950">{value}</p>
        </div>
    );
}
