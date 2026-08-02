import Link from "next/link";
import {
    Activity,
    ArrowRight,
    AtSign,
    BadgeCheck,
    BookOpen,
    Braces,
    BriefcaseBusiness,
    Building2,
    CalendarDays,
    Clock3,
    FileStack,
    GraduationCap,
    IdCard,
    LayoutDashboard,
    Medal,
    Network,
    ScrollText,
    UserRound,
    type LucideIcon,
} from "lucide-react";

import { BreakdownBarChart } from "@/components/charts/breakdown-bar-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";

type StudentWorkspace = {
    user: {
        name: string;
        email: string;
        accountStatus: string;
        lastLoginAt?: string;
    };
    student: {
        enrollmentNo: string;
        admissionYear: number;
        status: string;
    };
    institution?: {
        name?: string;
    };
    department?: {
        name?: string;
    };
    program?: {
        name?: string;
        degreeType?: string;
        durationYears?: number;
    };
};

type StudentRecordCounts = {
    academics: number;
    publications: number;
    research: number;
    awards: number;
    skills: number;
    sports: number;
    cultural: number;
    events: number;
    social: number;
    placements: number;
    internships: number;
    total: number;
};

function formatLastLogin(value?: string) {
    if (!value) {
        return "First-time access";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "First-time access";
    }

    return new Intl.DateTimeFormat("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export function StudentWorkspaceHome({
    workspace,
    recordCounts,
}: {
    workspace: StudentWorkspace;
    recordCounts: StudentRecordCounts;
}) {
    const achievements =
        recordCounts.publications + recordCounts.research + recordCounts.awards + recordCounts.skills;
    const engagements =
        recordCounts.sports + recordCounts.cultural + recordCounts.events + recordCounts.social;
    const careerOutcomes = recordCounts.placements + recordCounts.internships;

    const summaryCards: Array<{
        label: string;
        value: number;
        description: string;
        icon: LucideIcon;
    }> = [
        {
            label: "Academic records",
            value: recordCounts.academics,
            description: "Semester-wise progression entries",
            icon: GraduationCap,
        },
        {
            label: "Achievements",
            value: achievements,
            description: "Publications, research, awards, and skills",
            icon: Medal,
        },
        {
            label: "Engagement",
            value: engagements,
            description: "Sports, events, cultural, and social activity",
            icon: Activity,
        },
        {
            label: "Career outcomes",
            value: careerOutcomes,
            description: "Internships and placement updates",
            icon: BriefcaseBusiness,
        },
    ];

    const quickRoutes: Array<{
        title: string;
        description: string;
        href: string;
        icon: LucideIcon;
    }> = [
        {
            title: "Continue academic updates",
            description: "Open semester performance, SGPA, CGPA, and result records.",
            href: "/student/records?tab=academics",
            icon: GraduationCap,
        },
        {
            title: "Track achievements",
            description: "Maintain publications, research, awards, and skill certifications.",
            href: "/student/records?tab=publications",
            icon: Medal,
        },
        {
            title: "Manage outcomes",
            description: "Review internships, placements, and supporting evidence.",
            href: "/student/records?tab=placements",
            icon: BriefcaseBusiness,
        },
        {
            title: "Respond to SSR asks",
            description: "Complete the SSR sections and metrics assigned to your student account.",
            href: "/student/ssr",
            icon: ScrollText,
        },
        {
            title: "Submit SSS survey",
            description: "Respond to the active Student Satisfaction Survey anonymously.",
            href: "/student/sss",
            icon: BadgeCheck,
        },
        {
            title: "Review profile mapping",
            description: "Check program, department, and institutional identity details.",
            href: "/student/profile",
            icon: UserRound,
        },
    ];

    const coverageRows = [
        { label: "Publications", value: recordCounts.publications },
        { label: "Research", value: recordCounts.research },
        { label: "Awards", value: recordCounts.awards },
        { label: "Skills", value: recordCounts.skills },
        { label: "Sports", value: recordCounts.sports },
        { label: "Cultural", value: recordCounts.cultural },
        { label: "Events", value: recordCounts.events },
        { label: "Social", value: recordCounts.social },
        { label: "Placements", value: recordCounts.placements },
        { label: "Internships", value: recordCounts.internships },
    ];

    const identityRows: Array<{ label: string; value: string; icon: LucideIcon }> = [
        { label: "Enrollment No.", value: workspace.student.enrollmentNo, icon: IdCard },
        { label: "Institution Email", value: workspace.user.email, icon: AtSign },
        { label: "Institution", value: workspace.institution?.name ?? "-", icon: Building2 },
        { label: "Department", value: workspace.department?.name ?? "-", icon: Network },
        { label: "Program", value: workspace.program?.name ?? "-", icon: BookOpen },
        { label: "Degree Type", value: workspace.program?.degreeType ?? "-", icon: Braces },
        { label: "Admission Year", value: String(workspace.student.admissionYear), icon: CalendarDays },
        { label: "Last Login", value: formatLastLogin(workspace.user.lastLoginAt), icon: Clock3 },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                icon={LayoutDashboard}
                eyebrow="Student Dashboard"
                title={workspace.user.name}
                description="Your accreditation workspace, organized so you can move between identity details and records entry comfortably on desktop and mobile."
                meta={
                    <>
                        <StatusBadge status={workspace.student.status} />
                        <StatusBadge status={workspace.user.accountStatus} />
                        <Badge variant="secondary" className="gap-1">
                            <FileStack aria-hidden />
                            {recordCounts.total} tracked records
                        </Badge>
                    </>
                }
                actions={
                    <>
                        <Button asChild>
                            <Link href="/student/records" prefetch={false}>
                                <FileStack aria-hidden />
                                Records workspace
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/student/profile" prefetch={false}>
                                <UserRound aria-hidden />
                                Profile mapping
                            </Link>
                        </Button>
                    </>
                }
            />

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                    <StatCard
                        key={card.label}
                        icon={card.icon}
                        label={card.label}
                        value={card.value}
                        helper={card.description}
                        tone="accent"
                    />
                ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                            Quick routes
                        </CardTitle>
                        <CardDescription>
                            Jump straight into the part of the student workflow you want to update next.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2.5 lg:grid-cols-2">
                        {quickRoutes.map((route) => {
                            const Icon = route.icon;

                            return (
                                <Link
                                    key={route.href}
                                    href={route.href}
                                    prefetch={false}
                                    className="group flex flex-col rounded-lg border bg-muted/30 p-4 transition-colors hover:border-primary/40 hover:bg-accent"
                                >
                                    <span className="flex items-center gap-2">
                                        <Icon
                                            className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                                            aria-hidden
                                        />
                                        <span className="text-sm font-semibold text-foreground">
                                            {route.title}
                                        </span>
                                    </span>
                                    <span className="mt-1.5 text-xs leading-5 text-muted-foreground">
                                        {route.description}
                                    </span>
                                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                                        Open
                                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                                    </span>
                                </Link>
                            );
                        })}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <IdCard className="size-4 text-muted-foreground" aria-hidden />
                            Academic identity
                        </CardTitle>
                        <CardDescription>
                            Centrally provisioned details used throughout the student workflow.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        {identityRows.map((row) => {
                            const Icon = row.icon;

                            return (
                                <div
                                    key={row.label}
                                    className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3"
                                >
                                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                                    <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                                        {row.label}
                                    </span>
                                    <span className="min-w-0 max-w-[60%] truncate text-right text-sm font-medium text-foreground">
                                        {row.value}
                                    </span>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BadgeCheck className="size-4 text-muted-foreground" aria-hidden />
                            Record coverage
                        </CardTitle>
                        <CardDescription>
                            Where your portfolio is strong, and where it is still thin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <BreakdownBarChart
                            valueLabel="Records"
                            max={10}
                            data={coverageRows}
                            emptyMessage="You have not added any records yet. Start from the records workspace."
                        />
                        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
                            <IconChip icon={Clock3} tone="neutral" size="sm" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">
                                    What this workspace is for
                                </p>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    The student portal tracks progression, achievements, engagement, and career
                                    outcomes in one place so your institutional data stays ready for review and
                                    reporting.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <section className="grid gap-4 sm:grid-cols-2">
                    <StatCard
                        icon={BookOpen}
                        label="Academic performance"
                        value={recordCounts.academics}
                        helper="Semester entries currently stored"
                        tone="info"
                    />
                    <StatCard
                        icon={Medal}
                        label="Achievement portfolio"
                        value={achievements}
                        helper="Research, awards, publications, and skills"
                        tone="success"
                    />
                    <StatCard
                        icon={BriefcaseBusiness}
                        label="Placement readiness"
                        value={careerOutcomes}
                        helper="Placement and internship outcomes tracked"
                        tone={careerOutcomes > 0 ? "success" : "warning"}
                    />
                    <StatCard
                        icon={Activity}
                        label="Engagement"
                        value={engagements}
                        helper="Sports, cultural, events, and social work"
                        tone="accent"
                    />
                </section>
            </section>
        </div>
    );
}
