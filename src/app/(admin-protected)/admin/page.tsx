import Link from "next/link";
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    Building2,
    ClipboardList,
    Database,
    FileText,
    FlaskConical,
    FolderCog,
    GitBranch,
    GraduationCap,
    LayoutDashboard,
    ListTree,
    Lock,
    MessageSquare,
    Megaphone,
    ScrollText,
    ShieldCheck,
    Sparkles,
    UserPlus,
    Users,
    type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatTile } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminDashboardData } from "@/lib/admin/dashboard";

export default async function AdminDashboardPage() {
    const dashboard = await getAdminDashboardData();
    const { metrics } = dashboard;

    return (
        <div className="space-y-6">
            <PageHeader
                icon={LayoutDashboard}
                eyebrow="UMIS Admin Dashboard"
                title="Institution-wide control and monitoring"
                description="Maintain institutional masters, user access, reporting readiness, and system-wide notices from one workspace."
                actions={
                    <>
                        <Button asChild>
                            <Link href="/admin/master-data" prefetch={false}>
                                <Database aria-hidden />
                                Manage Master Data
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/admin/reference-masters" prefetch={false}>
                                <ListTree aria-hidden />
                                Reference Masters
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/admin/users" prefetch={false}>
                                <Users aria-hidden />
                                Review Users
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/admin/hierarchy" prefetch={false}>
                                <GitBranch aria-hidden />
                                Hierarchy
                            </Link>
                        </Button>
                    </>
                }
            />

            {/* Tone here is semantic, not decorative: pending verification and
                locked reporting units are the two numbers an admin should act on. */}
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={Users} label="Total Users" value={metrics.totalUsers} tone="accent" />
                <StatCard icon={ShieldCheck} label="Admin Users" value={metrics.adminUsers} tone="info" />
                <StatCard
                    icon={FolderCog}
                    label="Active Master Data"
                    value={metrics.activeMasterData}
                    tone="success"
                />
                <StatCard
                    icon={ClipboardList}
                    label="Pending Verification"
                    value={metrics.pendingVerification}
                    tone={metrics.pendingVerification > 0 ? "warning" : "success"}
                    helper={metrics.pendingVerification > 0 ? "Awaiting email verification" : "All users verified"}
                />
                <StatCard icon={Building2} label="Organizations" value={metrics.organizations} tone="accent" />
                <StatCard icon={BookOpen} label="Programs" value={metrics.programs} tone="accent" />
                <StatCard icon={BarChart3} label="Reports" value={metrics.reports} tone="info" />
                <StatCard
                    icon={Lock}
                    label="Locked Reporting Units"
                    value={metrics.reportingLocks}
                    tone={metrics.reportingLocks > 0 ? "info" : "neutral"}
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="size-4 text-muted-foreground" aria-hidden />
                            Operational readiness
                        </CardTitle>
                        <CardDescription>
                            Current activity across research, reporting, communication, and feedback modules.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                        <StatTile icon={GraduationCap} label="Faculty accounts" value={metrics.facultyUsers} />
                        <StatTile icon={Users} label="Student accounts" value={metrics.studentUsers} />
                        <StatTile icon={MessageSquare} label="Feedback entries" value={metrics.feedbackEntries} />
                        <StatTile icon={Megaphone} label="System updates" value={metrics.systemUpdates} />
                        <StatTile icon={ScrollText} label="Publications" value={metrics.publications} />
                        <StatTile icon={FlaskConical} label="Projects" value={metrics.projects} />
                        <StatTile icon={Sparkles} label="Research activities" value={metrics.researchActivities} />
                        <StatTile icon={FileText} label="Reports in repository" value={metrics.reports} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                            Quick actions
                        </CardTitle>
                        <CardDescription>
                            Recommended first steps to operationalize a production UMIS setup.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <QuickAction
                            href="/admin/hierarchy"
                            icon={GitBranch}
                            title="Build the hierarchy"
                            text="University, college, and department structure with organizational heads mapped for migration compatibility."
                        />
                        <QuickAction
                            href="/admin/master-data"
                            icon={Database}
                            title="Create supporting enums"
                            text="Academic years, report categories, and offices."
                        />
                        <QuickAction
                            href="/admin/reference-masters"
                            icon={ListTree}
                            title="Govern reference masters"
                            text="Awards, skills, sports, cultural activities, social programmes, and events, before users submit records."
                        />
                        <QuickAction
                            href="/admin/governance"
                            icon={ShieldCheck}
                            title="Assign governance roles"
                            text="HOD, principal, IQAC, director, office-head, and committee assignments."
                        />
                        <QuickAction
                            href="/admin/ssr"
                            icon={ScrollText}
                            title="Define SSR cycles"
                            text="Metric ownership, narrative sections, and contributor assignments before data collection begins."
                        />
                        <QuickAction
                            href="/admin/teaching-learning"
                            icon={GraduationCap}
                            title="Create delivery plans"
                            text="Assign eligible faculty before teaching-learning evidence collection starts."
                        />
                        <QuickAction
                            href="/admin/research-innovation"
                            icon={FlaskConical}
                            title="Create research portfolios"
                            text="Assign eligible coordinators and link ecosystem evidence before leadership review."
                        />
                        <QuickAction
                            href="/admin/system"
                            icon={Megaphone}
                            title="Publish notices"
                            text="Onboarding notices, reporting deadlines, and dashboard messages."
                        />
                        <QuickAction
                            href="/admin/audit-logs"
                            icon={ScrollText}
                            title="Review audit logs"
                            text="Admin, AQAR, faculty, student, and evidence changes."
                        />
                        <QuickAction
                            href="/register"
                            icon={UserPlus}
                            title="Validate onboarding"
                            text="Check faculty and student sign-up once master data is populated."
                        />
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="size-4 text-muted-foreground" aria-hidden />
                            Recently onboarded users
                        </CardTitle>
                        <CardDescription>Latest access requests and institutional mappings.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {dashboard.recentUsers.length ? (
                            dashboard.recentUsers.map((user) => (
                                <div
                                    className="rounded-lg border bg-muted/40 p-4 transition-colors hover:bg-muted/70"
                                    key={user._id.toString()}
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-base font-semibold text-foreground">{user.name}</h3>
                                        <Badge variant="secondary">{user.role}</Badge>
                                        <StatusBadge active={user.isActive} />
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {user.universityName || "No university"} / {user.collegeName || "No college"} /{" "}
                                        {user.department || "No department"}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <EmptyState
                                bordered
                                icon={UserPlus}
                                title="No users yet"
                                description="Onboarded accounts will appear here."
                            />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="size-4 text-muted-foreground" aria-hidden />
                            Recently updated master data
                        </CardTitle>
                        <CardDescription>
                            Track the newest enum and configuration changes impacting the platform.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {dashboard.recentMasterData.length ? (
                            dashboard.recentMasterData.map((item) => (
                                <div
                                    className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-4"
                                    key={item._id.toString()}
                                >
                                    <h3 className="text-base font-semibold text-foreground">{item.label}</h3>
                                    <Badge variant="secondary">{item.category}</Badge>
                                    <StatusBadge active={item.isActive} />
                                </div>
                            ))
                        ) : (
                            <EmptyState
                                bordered
                                icon={Database}
                                title="No master data yet"
                                description="Create academic years, categories, and offices to get started."
                                action={
                                    <Button asChild size="sm">
                                        <Link href="/admin/master-data" prefetch={false}>
                                            <Database aria-hidden />
                                            Add master data
                                        </Link>
                                    </Button>
                                }
                            />
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}

function QuickAction({
    href,
    icon: Icon,
    title,
    text,
}: {
    href: string;
    icon: LucideIcon;
    title: string;
    text: string;
}) {
    return (
        <Link
            className="group flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-accent"
            href={href}
            prefetch={false}
        >
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{text}</span>
            </span>
            <ArrowRight
                className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
            />
        </Link>
    );
}
