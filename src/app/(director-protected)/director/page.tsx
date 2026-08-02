import Link from "next/link";
import {
    ArrowRight,
    BarChart3,
    BookMarked,
    Building2,
    ClipboardCheck,
    ClipboardList,
    Crown,
    FileText,
    FlaskConical,
    GraduationCap,
    HeartHandshake,
    Inbox,
    LayoutDashboard,
    Layers,
    Network,
    ScrollText,
    Shield,
    Sparkles,
    Users,
    type LucideIcon,
} from "lucide-react";

import { BreakdownBarChart } from "@/components/charts/breakdown-bar-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatTile } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireDirector } from "@/lib/auth/user";
import { getLeadershipDashboardData } from "@/lib/director/dashboard";

/** Module key -> icon, so the cards below match the sidebar icons. */
const MODULE_ICONS: Record<string, LucideIcon> = {
    PBAS: Shield,
    CAS: ClipboardList,
    AQAR: BarChart3,
    SSR: ScrollText,
    Curriculum: BookMarked,
    "Teaching Learning": GraduationCap,
    Infrastructure: Building2,
    "Student Support": HeartHandshake,
    "Leadership & IQAC": Crown,
    "Institutional Values": Sparkles,
    Research: FlaskConical,
};

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
            <PageHeader
                icon={LayoutDashboard}
                eyebrow={`${dashboard.access.displayRole} workspace`}
                title="Leadership operations overview"
                description="Scoped to your active governance assignments and committee memberships. You can browse only authorized records, and action controls appear only when a workflow is currently assigned to you."
                meta={
                    <div className="flex flex-wrap gap-1.5">
                        {dashboard.access.roleLabels.map((label) => (
                            <Badge key={label} variant="secondary">
                                {label}
                            </Badge>
                        ))}
                    </div>
                }
                actions={
                    <>
                        <Button asChild>
                            <Link href="/director/approvals" prefetch={false}>
                                <ClipboardCheck aria-hidden />
                                Action queue
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/director/faculty" prefetch={false}>
                                <Users aria-hidden />
                                Faculty roster
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/director/reports" prefetch={false}>
                                <FileText aria-hidden />
                                Reports
                            </Link>
                        </Button>
                    </>
                }
            />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <StatCard icon={Users} label="Faculty in scope" value={dashboard.metrics.facultyCount} tone="accent" />
                <StatCard
                    icon={Network}
                    label="Departments in scope"
                    value={dashboard.metrics.departmentCount}
                    tone="accent"
                />
                <StatCard
                    icon={Inbox}
                    label="Actionable items"
                    value={dashboard.metrics.actionableItems}
                    tone={dashboard.metrics.actionableItems > 0 ? "warning" : "success"}
                    helper={
                        dashboard.metrics.actionableItems > 0
                            ? "Waiting on your decision"
                            : "Nothing waiting on you"
                    }
                />
                <StatCard
                    icon={ClipboardList}
                    label="Active assignments"
                    value={dashboard.metrics.activeAssignments}
                    tone="info"
                />
                <StatCard
                    icon={Crown}
                    label="Active committees"
                    value={dashboard.metrics.activeCommittees}
                    tone="info"
                />
                <StatCard
                    icon={Layers}
                    label="Evidence pending"
                    value={dashboard.metrics.evidencePending}
                    tone={dashboard.metrics.evidencePending > 0 ? "warning" : "success"}
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Inbox className="size-4 text-muted-foreground" aria-hidden />
                            Action queue
                        </CardTitle>
                        <CardDescription>
                            The most recent PBAS, CAS, AQAR, SSR, curriculum, teaching-learning, infrastructure,
                            student-support, leadership/IQAC, institutional-values, and research items currently
                            waiting for your review or final approval.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {dashboard.queue.items.length ? (
                            dashboard.queue.items.map((item) => (
                                <div
                                    className="rounded-lg border border-l-2 border-l-warning bg-muted/40 p-4 transition-colors hover:bg-muted/70"
                                    key={`${item.moduleName}-${item.id}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                {item.moduleName}
                                            </p>
                                            <h3 className="mt-1.5 text-base font-semibold text-foreground">
                                                {item.title}
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
                                        </div>
                                        <Badge className="shrink-0">{item.actionLabel}</Badge>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                        <StatusBadge status={item.status} />
                                        <Button asChild variant="link" size="sm" className="px-0">
                                            <Link href={item.href} prefetch={false}>
                                                Open module
                                                <ArrowRight aria-hidden />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <EmptyState
                                bordered
                                icon={ClipboardCheck}
                                tone="success"
                                title="No action items"
                                description="No workflow items are currently assigned to your account."
                            />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="size-4 text-muted-foreground" aria-hidden />
                            Governance scope
                        </CardTitle>
                        <CardDescription>
                            Your current organizational reach across assignments, committees, and inherited scope.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {dashboard.scopes.length ? (
                            dashboard.scopes.map((scope, index) => (
                                <div
                                    className="rounded-lg border bg-muted/40 p-4"
                                    key={`${scope.label}-${index}`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="min-w-0 truncate text-base font-semibold text-foreground">
                                            {scope.label}
                                        </h3>
                                        <Badge variant="secondary" className="shrink-0">
                                            {scope.scopeType}
                                        </Badge>
                                    </div>
                                    {scope.organizationName ? (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {scope.organizationName}
                                        </p>
                                    ) : null}
                                </div>
                            ))
                        ) : (
                            <EmptyState
                                bordered
                                icon={Shield}
                                title="No governance scope"
                                description="No active governance scope is mapped to this account yet."
                            />
                        )}
                    </CardContent>
                </Card>
            </section>

            {/* Was xl:grid-cols-8 for 11 cards, which squeezed each one to an
                unusable width. Three columns fits the content. */}
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                    description="Versioned curriculum drafts, BoS governance review, and syllabus approvals."
                />
                <ModuleCard
                    href="/director/teaching-learning"
                    label="Teaching Learning"
                    summary={dashboard.modules.TEACHING_LEARNING}
                    description="Course-delivery files, learner support actions, and teaching process reviews."
                />
                <ModuleCard
                    href="/director/infrastructure-library"
                    label="Infrastructure"
                    summary={dashboard.modules.INFRASTRUCTURE_LIBRARY}
                    description="Facilities, library resources, usage analytics, and maintenance-backed reviews."
                />
                <ModuleCard
                    href="/director/student-support-governance"
                    label="Student Support"
                    summary={dashboard.modules.STUDENT_SUPPORT_GOVERNANCE}
                    description="Mentoring, grievance redressal, progression, and student-representation reviews."
                />
                <ModuleCard
                    href="/director/governance-leadership-iqac"
                    label="Leadership & IQAC"
                    summary={dashboard.modules.GOVERNANCE_LEADERSHIP_IQAC}
                    description="Governance structure, IQAC meetings, policy deployment, and compliance reviews."
                />
                <ModuleCard
                    href="/director/institutional-values-best-practices"
                    label="Institutional Values"
                    summary={dashboard.modules.INSTITUTIONAL_VALUES_BEST_PRACTICES}
                    description="Criteria 7 portfolios: sustainability, inclusiveness, ethics, and outreach."
                />
                <ModuleCard
                    href="/director/research-innovation"
                    label="Research"
                    summary={dashboard.modules.RESEARCH_INNOVATION}
                    description="Research portfolio files, innovation evidence, and committee-led scrutiny."
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="size-4 text-muted-foreground" aria-hidden />
                            Department backlog
                        </CardTitle>
                        <CardDescription>
                            Department-level pending load across approvals and student evidence verification.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {dashboard.departmentBreakdown.length ? (
                            <>
                                <BreakdownBarChart
                                    valueLabel="Pending items"
                                    secondaryLabel="Faculty"
                                    data={dashboard.departmentBreakdown.map((row) => ({
                                        label: row.departmentName,
                                        value:
                                            row.pbasPending +
                                            row.casPending +
                                            row.aqarPending +
                                            row.evidencePending,
                                        secondaryValue: row.facultyCount,
                                    }))}
                                    emptyMessage="No pending load in any department right now."
                                />
                                <ul className="space-y-2">
                                    {dashboard.departmentBreakdown.slice(0, 8).map((row) => (
                                        <li
                                            className="rounded-lg border bg-muted/40 p-3"
                                            key={row.departmentId}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">
                                                    {row.departmentName}
                                                </h3>
                                                <Badge variant="secondary" className="shrink-0">
                                                    {row.facultyCount} faculty
                                                </Badge>
                                            </div>
                                            <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                                                PBAS {row.pbasPending} • CAS {row.casPending} • AQAR{" "}
                                                {row.aqarPending} • Evidence {row.evidencePending}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <EmptyState
                                bordered
                                icon={Building2}
                                title="No departments in scope"
                                description="No departments were resolved from your current governance scope."
                            />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="size-4 text-muted-foreground" aria-hidden />
                            Faculty needing attention
                        </CardTitle>
                        <CardDescription>
                            Faculty records with active PBAS, CAS, or AQAR workflow movement inside your scope.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {facultyAttention.length ? (
                            facultyAttention.map((row) => (
                                <div
                                    className="rounded-lg border border-l-2 border-l-warning bg-muted/40 p-4"
                                    key={row.facultyId}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="truncate text-base font-semibold text-foreground">
                                                {row.facultyName}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {row.departmentName ?? "Department not mapped"} • {row.designation}
                                            </p>
                                        </div>
                                        <StatusBadge status="Pending" label="Needs attention" />
                                    </div>
                                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                        <span className="text-xs text-muted-foreground">PBAS</span>
                                        <StatusBadge status={row.pbasStatus ?? "None"} label={row.pbasStatus ?? "No record"} />
                                        <span className="ml-1 text-xs text-muted-foreground">CAS</span>
                                        <StatusBadge status={row.casStatus ?? "None"} label={row.casStatus ?? "No record"} />
                                        <span className="ml-1 text-xs text-muted-foreground">AQAR</span>
                                        <StatusBadge status={row.aqarStatus ?? "None"} label={row.aqarStatus ?? "No record"} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <EmptyState
                                bordered
                                icon={Users}
                                tone="success"
                                title="No faculty needing attention"
                                description="No faculty members currently need workflow attention in your scope."
                            />
                        )}
                        <Button asChild className="w-full" variant="outline">
                            <Link href="/director/faculty" prefetch={false}>
                                <Users aria-hidden />
                                Open full faculty roster
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </section>
        </div>
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
    const Icon = MODULE_ICONS[label] ?? Layers;

    return (
        <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <CardTitle className="flex min-w-0 items-center gap-2">
                        <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                        <span className="truncate">{label}</span>
                    </CardTitle>
                    <StatusBadge
                        status={summary.actionable > 0 ? "Pending" : "Completed"}
                        label={`${summary.actionable} actionable`}
                        className="shrink-0"
                    />
                </div>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                    <StatTile label="Total" value={summary.total} />
                    <StatTile label="Final approvals" value={summary.finalApprovals} />
                    <StatTile label="Approved" value={summary.approved} tone="success" />
                    <StatTile label="Rejected" value={summary.rejected} tone="danger" />
                </div>
                <Button asChild className="w-full" variant="outline">
                    <Link href={href} prefetch={false}>
                        Open {label}
                        <ArrowRight aria-hidden />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
