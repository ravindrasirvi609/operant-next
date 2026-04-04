import Link from "next/link";
import {
    BarChart3,
    BookOpen,
    Building2,
    ClipboardList,
    FolderCog,
    ShieldCheck,
    Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboardData } from "@/lib/admin/dashboard";

export default async function AdminDashboardPage() {
    const dashboard = await getAdminDashboardData();

    return (
        <div className="space-y-6">
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <Badge>UMIS Admin Dashboard</Badge>
                        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
                            Institution-wide control and monitoring
                        </h1>
                        <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-500">
                            This workspace is designed for operational administrators who maintain institutional masters, user access, reporting readiness, and system-wide notices.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button asChild>
                            <Link href="/admin/master-data" prefetch={false}>Manage Master Data</Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href="/admin/reference-masters" prefetch={false}>Govern Reference Masters</Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href="/admin/users" prefetch={false}>Review Users</Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href="/admin/hierarchy" prefetch={false}>Manage Hierarchy</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={<Users className="size-5" />} label="Total Users" value={dashboard.metrics.totalUsers} />
                <MetricCard icon={<ShieldCheck className="size-5" />} label="Admin Users" value={dashboard.metrics.adminUsers} />
                <MetricCard icon={<FolderCog className="size-5" />} label="Active Master Data" value={dashboard.metrics.activeMasterData} />
                <MetricCard icon={<ClipboardList className="size-5" />} label="Pending Verification" value={dashboard.metrics.pendingVerification} />
                <MetricCard icon={<Building2 className="size-5" />} label="Organizations" value={dashboard.metrics.organizations} />
                <MetricCard icon={<BookOpen className="size-5" />} label="Programs" value={dashboard.metrics.programs} />
                <MetricCard icon={<BarChart3 className="size-5" />} label="Reports" value={dashboard.metrics.reports} />
                <MetricCard icon={<ClipboardList className="size-5" />} label="Locked Reporting Units" value={dashboard.metrics.reportingLocks} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Operational readiness</CardTitle>
                        <CardDescription>
                            Current activity across research, reporting, communication, and feedback modules.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <InfoCard label="Faculty accounts" value={dashboard.metrics.facultyUsers} />
                        <InfoCard label="Student accounts" value={dashboard.metrics.studentUsers} />
                        <InfoCard label="Feedback entries" value={dashboard.metrics.feedbackEntries} />
                        <InfoCard label="System updates" value={dashboard.metrics.systemUpdates} />
                        <InfoCard label="Publications" value={dashboard.metrics.publications} />
                        <InfoCard label="Projects" value={dashboard.metrics.projects} />
                        <InfoCard label="Research activities" value={dashboard.metrics.researchActivities} />
                        <InfoCard label="Reports in repository" value={dashboard.metrics.reports} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Quick actions</CardTitle>
                        <CardDescription>
                            Recommended first steps to operationalize a production UMIS setup.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        <QuickAction href="/admin/hierarchy" text="Build the university-college-department hierarchy and map organizational heads for migration compatibility." />
                        <QuickAction href="/admin/master-data" text="Create supporting enums such as academic years, report categories, and offices." />
                        <QuickAction href="/admin/reference-masters" text="Govern awards, skills, sports, cultural activities, social programmes, and events before users submit records." />
                        <QuickAction href="/admin/governance" text="Create HOD, principal, IQAC, director, office-head, and committee assignments through governance mapping." />
                        <QuickAction href="/admin/ssr" text="Define SSR cycles, metric ownership, narrative sections, and contributor assignments before data collection begins." />
                        <QuickAction href="/admin/teaching-learning" text="Create governed delivery plans and assign eligible faculty before teaching-learning evidence collection starts." />
                        <QuickAction href="/admin/research-innovation" text="Create governed research portfolios, assign eligible coordinators, and link ecosystem evidence before leadership review begins." />
                        <QuickAction href="/admin/infrastructure-library" text="Create governed infrastructure and library portfolios, assign eligible coordinators, and collect audit-ready facilities evidence before review begins." />
                        <QuickAction href="/admin/student-support-governance" text="Create governed student-support portfolios, assign eligible coordinators, and collect mentoring, grievance, progression, and representation evidence before review begins." />
                        <QuickAction href="/admin/system" text="Publish onboarding notices, reporting deadlines, and dashboard messages." />
                        <QuickAction href="/admin/audit-logs" text="Review production audit logs for admin, AQAR, faculty, student, and evidence changes." />
                        <QuickAction href="/register" text="Validate faculty and student onboarding after master data is populated." />
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Recently onboarded users</CardTitle>
                        <CardDescription>
                            Latest access requests and institutional mappings.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {dashboard.recentUsers.map((user) => (
                            <div
                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                key={user._id.toString()}
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-base font-semibold text-zinc-950">
                                        {user.name}
                                    </h3>
                                    <Badge>{user.role}</Badge>
                                    <Badge
                                        className={
                                            user.isActive
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                : "border-rose-200 bg-rose-50 text-rose-700"
                                        }
                                    >
                                        {user.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                                <p className="mt-2 text-sm text-zinc-500">{user.email}</p>
                                <p className="mt-2 text-sm text-zinc-500">
                                    {user.universityName || "No university"} / {user.collegeName || "No college"} / {user.department || "No department"}
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recently updated master data</CardTitle>
                        <CardDescription>
                            Track the newest enum and configuration changes impacting the platform.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {dashboard.recentMasterData.map((item) => (
                            <div
                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                                key={item._id.toString()}
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-base font-semibold text-zinc-950">
                                        {item.label}
                                    </h3>
                                    <Badge>{item.category}</Badge>
                                    <Badge
                                        className={
                                            item.isActive
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                : "border-rose-200 bg-rose-50 text-rose-700"
                                        }
                                    >
                                        {item.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}

function MetricCard({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
}) {
    return (
        <Card>
            <CardContent className="flex items-center justify-between p-5">
                <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                        {label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
                </div>
                <div className="inline-flex size-12 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}

function InfoCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
        </div>
    );
}

function QuickAction({ href, text }: { href: string; text: string }) {
    return (
        <Link
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
            href={href}
            prefetch={false}
        >
            {text}
        </Link>
    );
}
